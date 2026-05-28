"""Sesión RTP UDP (PCMU) hacia/desde Asterisk externalMedia."""

from __future__ import annotations

import asyncio
import audioop
import logging
import random
import struct
from typing import Callable

logger = logging.getLogger(__name__)

RTP_HEADER_SIZE = 12
SAMPLES_PER_PACKET = 160  # 20 ms @ 8 kHz
PT_PCMU = 0


class RtpSession:
    def __init__(self, on_ulaw_frame: Callable[[bytes], None] | None = None) -> None:
        self._on_ulaw_frame = on_ulaw_frame
        self._transport: asyncio.DatagramTransport | None = None
        self._remote: tuple[str, int] | None = None
        self._seq = random.randint(0, 65535)
        self._timestamp = random.randint(0, 2**32 - 1)
        self._ssrc = random.randint(0, 2**32 - 1)
        self._closed = False
        self._recv_queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=64)

    @property
    def local_port(self) -> int | None:
        if not self._transport:
            return None
        sockname = self._transport.get_extra_info("sockname")
        return sockname[1] if sockname else None

    async def start(self, bind_host: str = "0.0.0.0", port: int = 0) -> int:
        loop = asyncio.get_running_loop()

        class _Protocol(asyncio.DatagramProtocol):
            def __init__(self, session: RtpSession) -> None:
                self.session = session

            def datagram_received(self, data: bytes, addr: tuple[str, int]) -> None:
                self.session._handle_datagram(data, addr)

        self._transport, _ = await loop.create_datagram_endpoint(
            lambda: _Protocol(self),
            local_addr=(bind_host, port),
        )
        bound_port = self.local_port
        if bound_port is None:
            raise RuntimeError("No se pudo abrir socket RTP")
        logger.info("RTP escuchando en %s:%s", bind_host, bound_port)
        return bound_port

    def _handle_datagram(self, data: bytes, addr: tuple[str, int]) -> None:
        if self._closed or len(data) < RTP_HEADER_SIZE:
            return
        if self._remote is None:
            self._remote = addr
            logger.info("RTP remoto aprendido: %s:%s", addr[0], addr[1])

        payload_type = data[1] & 0x7F
        if payload_type != PT_PCMU:
            return

        payload = data[RTP_HEADER_SIZE:]
        if not payload:
            return

        if self._on_ulaw_frame:
            self._on_ulaw_frame(payload)

        try:
            self._recv_queue.put_nowait(payload)
        except asyncio.QueueFull:
            pass

    def send_ulaw(self, payload: bytes) -> None:
        if self._closed or not self._transport or not self._remote:
            return
        if len(payload) > SAMPLES_PER_PACKET:
            payload = payload[:SAMPLES_PER_PACKET]
        elif len(payload) < SAMPLES_PER_PACKET:
            payload = payload + b"\xff" * (SAMPLES_PER_PACKET - len(payload))

        header = struct.pack(
            "!BBHII",
            0x80,
            PT_PCMU,
            self._seq & 0xFFFF,
            self._timestamp & 0xFFFFFFFF,
            self._ssrc,
        )
        self._seq = (self._seq + 1) & 0xFFFF
        self._timestamp = (self._timestamp + SAMPLES_PER_PACKET) & 0xFFFFFFFF
        self._transport.sendto(header + payload, self._remote)

    async def recv_ulaw_frame(self, timeout: float = 0.5) -> bytes | None:
        try:
            return await asyncio.wait_for(self._recv_queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None

    @staticmethod
    def ulaw_to_pcm(ulaw: bytes) -> bytes:
        return audioop.ulaw2lin(ulaw, 2)

    @staticmethod
    def pcm_to_ulaw(pcm: bytes) -> bytes:
        return audioop.lin2ulaw(pcm, 2)

    @staticmethod
    def resample_pcm(pcm: bytes, from_rate: int, to_rate: int = 8000) -> bytes:
        if from_rate == to_rate:
            return pcm
        converted, _ = audioop.ratecv(pcm, 2, 1, from_rate, to_rate, None)
        return converted

    def close(self) -> None:
        self._closed = True
        if self._transport:
            self._transport.close()
            self._transport = None
