"""Gestión de sesiones externalMedia + WebRTC por llamada."""

from __future__ import annotations

import logging
from typing import Any

from ari.client import AriClient
from calls.models import CallState
from calls.registry import CallRegistry
from config import Settings, get_settings
from media.rtp_session import RtpSession

logger = logging.getLogger(__name__)


class MediaManager:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._sessions: dict[str, object] = {}
        self._rtp_sessions: dict[str, RtpSession] = {}

    @property
    def enabled(self) -> bool:
        return self.settings.webrtc_enabled

    def has_session(self, call_id: str) -> bool:
        return call_id in self._sessions

    def ice_servers(self) -> list[dict[str, Any]]:
        servers: list[dict[str, Any]] = []
        if self.settings.webrtc_stun_url:
            servers.append({"urls": self.settings.webrtc_stun_url})
        return servers

    async def prepare_session(self, call_id: str) -> None:
        """Crea socket RTP + peer WebRTC antes de Stasis (evita 409 en /webrtc/offer)."""
        if call_id in self._sessions:
            return

        rtp = RtpSession()
        port = await rtp.start(
            bind_host=self.settings.external_media_bind_host,
            port=0,
        )
        self._rtp_sessions[call_id] = rtp

        try:
            from media.webrtc_session import WebRtcBridgeSession
        except ImportError as exc:
            rtp.close()
            self._rtp_sessions.pop(call_id, None)
            raise RuntimeError(
                "WebRTC requiere aiortc. Ejecutá: pip install aiortc av"
            ) from exc

        self._sessions[call_id] = WebRtcBridgeSession(
            call_id,
            rtp,
            ice_servers=self.ice_servers(),
        )
        logger.info(
            "Sesión WebRTC preparada call_id=%s (RTP puerto %s)",
            call_id,
            port,
        )

    async def attach_external_media(
        self,
        call: CallState,
        ari: AriClient,
        registry: CallRegistry,
    ) -> None:
        if not self.enabled or call.external_media_attached:
            return

        await self.prepare_session(call.call_id)
        rtp = self._rtp_sessions[call.call_id]
        port = rtp.local_port
        if port is None:
            raise RuntimeError("Puerto RTP no disponible")

        advertise = self.settings.external_media_advertise_host
        external_host = f"{advertise}:{port}"

        try:
            channel = await ari.create_external_media(
                external_host=external_host,
                app_args=[call.call_id, "media"],
                fmt=self.settings.external_media_format,
            )
            channel_id = channel["id"]
            registry.link_channel(call, channel_id)
            call.external_media_channel_id = channel_id
            call.external_media_attached = True
            logger.info(
                "externalMedia %s → %s para llamada %s",
                channel_id,
                external_host,
                call.call_id,
            )
        except Exception as exc:
            logger.error(
                "No se pudo crear externalMedia para %s: %s",
                call.call_id,
                exc,
            )
            raise

    async def apply_offer(
        self, call_id: str, sdp: str, offer_type: str
    ) -> dict[str, str]:
        await self.prepare_session(call_id)
        session = self._sessions[call_id]
        return await session.apply_offer(sdp, offer_type)  # type: ignore[union-attr]

    async def add_ice_candidate(
        self,
        call_id: str,
        candidate: str | None,
        sdp_mid: str | None,
        sdp_mline_index: int | None,
    ) -> None:
        if call_id not in self._sessions:
            return
        session = self._sessions[call_id]
        await session.add_ice_candidate(  # type: ignore[union-attr]
            candidate, sdp_mid, sdp_mline_index
        )

    async def close_session(self, call_id: str) -> None:
        session = self._sessions.pop(call_id, None)
        self._rtp_sessions.pop(call_id, None)
        if session:
            await session.close()  # type: ignore[union-attr]
            logger.info("Sesión WebRTC cerrada call_id=%s", call_id)
