import asyncio
import base64
import json
import logging
from collections.abc import Awaitable, Callable
from typing import Any
from urllib.parse import quote

import websockets
from websockets.exceptions import ConnectionClosed

from config import Settings, get_settings

logger = logging.getLogger(__name__)

EventHandler = Callable[[dict[str, Any]], Awaitable[None]]


class AriEventsListener:
    def __init__(
        self,
        on_event: EventHandler,
        settings: Settings | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self._on_event = on_event
        self._task: asyncio.Task[None] | None = None
        self._stop = asyncio.Event()
        self.connected = False

    def start(self) -> None:
        if self._task is None or self._task.done():
            self._stop.clear()
            self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        self.connected = False

    def _build_url(self) -> str:
        app = quote(self.settings.stasis_app)
        return (
            f"{self.settings.ari_ws_url}/ari/events"
            f"?app={app}&subscribeAll=true"
        )

    async def _run_loop(self) -> None:
        backoff = 1.0
        while not self._stop.is_set():
            try:
                await self._connect_once()
                backoff = 1.0
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.connected = False
                logger.warning("ARI WebSocket error: %s. Reconnecting in %.1fs", exc, backoff)
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=backoff)
                    break
                except asyncio.TimeoutError:
                    pass
                backoff = min(backoff * 2, 30.0)

    async def _connect_once(self) -> None:
        url = self._build_url()
        credentials = base64.b64encode(
            f"{self.settings.ari_user}:{self.settings.ari_password}".encode()
        ).decode()
        logger.info("Connecting to ARI WebSocket: %s", url)

        async with websockets.connect(
            url,
            subprotocols=["ari"],
            ping_interval=20,
            ping_timeout=20,
            additional_headers={"Authorization": f"Basic {credentials}"},
        ) as ws:
            self.connected = True
            logger.info("ARI WebSocket connected (app=%s)", self.settings.stasis_app)
            async for message in ws:
                if self._stop.is_set():
                    break
                try:
                    event = json.loads(message)
                    await self._on_event(event)
                except json.JSONDecodeError as exc:
                    logger.error("Invalid ARI event JSON: %s", exc)
                except Exception as exc:
                    logger.exception("Error handling ARI event: %s", exc)

        self.connected = False
        if not self._stop.is_set():
            raise ConnectionClosed(None, None)
