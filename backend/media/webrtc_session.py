"""Puente WebRTC (navegador) ↔ RTP (Asterisk externalMedia) vía aiortc."""

from __future__ import annotations

import asyncio
import fractions
import logging
from typing import Any

import av
from aiortc import (
    RTCConfiguration,
    RTCIceServer,
    RTCPeerConnection,
    RTCSessionDescription,
)
from aiortc.mediastreams import MediaStreamTrack

from media.rtp_session import RtpSession, SAMPLES_PER_PACKET

logger = logging.getLogger(__name__)


def _rtc_configuration(ice_servers: list[dict[str, Any]]) -> RTCConfiguration | None:
    servers: list[RTCIceServer] = []
    for entry in ice_servers:
        urls = entry.get("urls")
        if urls:
            servers.append(RTCIceServer(urls=urls))
    if not servers:
        return None
    return RTCConfiguration(iceServers=servers)


class AsteriskAudioTrack(MediaStreamTrack):
    """Audio de Asterisk hacia el navegador."""

    kind = "audio"

    def __init__(self, rtp: RtpSession) -> None:
        super().__init__()
        self._rtp = rtp
        self._pts = 0

    async def recv(self) -> av.AudioFrame:
        while True:
            ulaw = await self._rtp.recv_ulaw_frame(timeout=0.1)
            if ulaw:
                break
            await asyncio.sleep(0.01)

        pcm = RtpSession.ulaw_to_pcm(ulaw)
        samples = len(pcm) // 2
        frame = av.AudioFrame(format="s16", layout="mono", samples=samples)
        frame.planes[0].update(pcm)
        frame.sample_rate = 8000
        frame.pts = self._pts
        frame.time_base = fractions.Fraction(1, 8000)
        self._pts += samples
        return frame


class WebRtcBridgeSession:
    def __init__(self, call_id: str, rtp: RtpSession, ice_servers: list[dict[str, Any]]) -> None:
        self.call_id = call_id
        self.rtp = rtp
        self._ice_servers = ice_servers
        self.pc: RTCPeerConnection | None = None
        self.asterisk_track = AsteriskAudioTrack(rtp)
        self._browser_task: asyncio.Task[None] | None = None
        self._closed = False

    async def apply_offer(self, sdp: str, offer_type: str) -> dict[str, str]:
        if self._closed:
            raise RuntimeError("Sesión WebRTC cerrada")

        if self.pc:
            await self.pc.close()
            self.pc = None

        self.pc = RTCPeerConnection(configuration=_rtc_configuration(self._ice_servers))
        self.pc.addTrack(self.asterisk_track)

        @self.pc.on("track")
        def on_track(track: MediaStreamTrack) -> None:
            if track.kind == "audio":
                self._browser_task = asyncio.create_task(
                    self._consume_browser_audio(track),
                    name=f"browser-audio-{self.call_id}",
                )

        @self.pc.on("connectionstatechange")
        async def on_connectionstatechange() -> None:
            if self.pc and self.pc.connectionState in ("failed", "closed"):
                logger.warning(
                    "WebRTC call_id=%s connectionState=%s",
                    self.call_id,
                    self.pc.connectionState,
                )

        offer = RTCSessionDescription(sdp=sdp, type=offer_type)
        await self.pc.setRemoteDescription(offer)
        answer = await self.pc.createAnswer()
        await self.pc.setLocalDescription(answer)
        await self._wait_ice_gathering()

        local = self.pc.localDescription
        if not local:
            raise RuntimeError("Sin SDP local tras createAnswer")
        logger.info("WebRTC negociado para llamada %s", self.call_id)
        return {"sdp": local.sdp, "type": local.type}

    async def add_ice_candidate(
        self,
        candidate: str | None,
        sdp_mid: str | None,
        sdp_mline_index: int | None,
    ) -> None:
        if not self.pc or not candidate:
            return
        from aiortc.sdp import candidate_from_sdp

        ice = candidate_from_sdp(candidate)
        ice.sdpMid = sdp_mid
        ice.sdpMLineIndex = sdp_mline_index
        await self.pc.addIceCandidate(ice)

    async def _wait_ice_gathering(self, timeout: float = 10.0) -> None:
        if not self.pc:
            return
        if self.pc.iceGatheringState == "complete":
            return

        done: asyncio.Future[None] = asyncio.get_running_loop().create_future()

        @self.pc.on("icegatheringstatechange")
        def on_gathering_change() -> None:
            if self.pc and self.pc.iceGatheringState == "complete" and not done.done():
                done.set_result(None)

        try:
            await asyncio.wait_for(done, timeout=timeout)
        except asyncio.TimeoutError:
            logger.warning("ICE gathering timeout call_id=%s", self.call_id)

    async def _consume_browser_audio(self, track: MediaStreamTrack) -> None:
        logger.info("Consumiendo audio del navegador call_id=%s", self.call_id)
        try:
            while not self._closed:
                frame = await track.recv()
                pcm = bytes(frame.planes[0])
                rate = frame.sample_rate or 48000
                pcm = RtpSession.resample_pcm(pcm, rate, 8000)
                ulaw = RtpSession.pcm_to_ulaw(pcm)
                for offset in range(0, len(ulaw), SAMPLES_PER_PACKET):
                    chunk = ulaw[offset : offset + SAMPLES_PER_PACKET]
                    if chunk:
                        self.rtp.send_ulaw(chunk)
        except Exception as exc:
            if not self._closed:
                logger.info("Fin audio navegador call_id=%s: %s", self.call_id, exc)

    async def close(self) -> None:
        self._closed = True
        if self._browser_task:
            self._browser_task.cancel()
            try:
                await self._browser_task
            except asyncio.CancelledError:
                pass
        if self.pc:
            await self.pc.close()
            self.pc = None
        self.rtp.close()
