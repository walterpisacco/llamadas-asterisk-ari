import asyncio
import logging
import time
from typing import Any, Callable, Awaitable

from ari.client import AriClient
from ari.debug_log import log_ari_event
from ari.events import AriEventsListener
from calls.models import CallState
from calls.registry import CallRegistry
from calls.state_machine import CallStateMachine, PROCESSED_CHANNELS
from config import Settings, get_settings
from media.manager import MediaManager
from services.agent_session import AgentSessionStore

logger = logging.getLogger(__name__)

BroadcastFn = Callable[[dict[str, Any]], Awaitable[None]]


class CallService:
    def __init__(
        self,
        settings: Settings | None = None,
        broadcast: BroadcastFn | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.ari = AriClient(self.settings)
        self.registry = CallRegistry()
        self.media_manager = MediaManager(self.settings)
        self.state_machine = CallStateMachine(
            self.ari,
            self.registry,
            self.settings,
            media_manager=self.media_manager,
            call_resolver=self.resolve_call_for_event,
            get_agent_endpoint=self.get_agent_endpoint,
        )
        self._broadcast = broadcast
        self.agent_session = AgentSessionStore()
        self.ari_listener = AriEventsListener(self._handle_ari_event, self.settings)
        self._pending_outbound: dict[str, str] = {}
        self._outbound_calls: dict[str, CallState] = {}
        self._cleaned_calls: set[str] = set()

    def resolve_call_for_event(
        self, channel_id: str | None, event: dict[str, Any]
    ) -> CallState | None:
        """Busca la llamada por canal, call_id en args o caché de salientes."""
        args = event.get("args") or []
        call_id = str(args[0]).strip() if args and args[0] else None

        if channel_id:
            by_ch = self.registry.get_by_channel(channel_id)
            if by_ch:
                return by_ch

        if call_id:
            found = self.registry.get(call_id)
            if found:
                return found
            cached = self._outbound_calls.get(call_id)
            if cached:
                self.registry.add(cached)
                if channel_id:
                    self.registry.link_channel(cached, channel_id)
                logger.info(
                    "Llamada %s re-sincronizada al registry (Stasis)",
                    call_id,
                )
                return cached

        if channel_id:
            for cid, ch in self._pending_outbound.items():
                if ch == channel_id:
                    cached = self._outbound_calls.get(cid)
                    if cached:
                        self.registry.add(cached)
                        self.registry.link_channel(cached, channel_id)
                        return cached
        return None

    def set_broadcast(self, fn: BroadcastFn) -> None:
        self._broadcast = fn

    async def startup(self) -> None:
        try:
            await self.ari.cleanup_all()
        except Exception as exc:
            logger.warning("ARI cleanup on startup failed: %s", exc)
        PROCESSED_CHANNELS.clear()
        self.ari_listener.start()
        if not self.ari_listener.task_alive:
            logger.error("No se pudo iniciar la tarea del WebSocket ARI")
        elif not self.ari_listener.connected:
            logger.info(
                "WebSocket ARI conectando… (HTTP ARI alcanzable=%s)",
                await self.ari_healthy(),
            )

    async def shutdown(self) -> None:
        await self.ari_listener.stop()
        await self.ari.close()

    async def _handle_ari_event(self, event: dict[str, Any]) -> None:
        '''
        if self.settings.ari_debug:
            log_ari_event(
                event,
                full=self.settings.ari_debug_full_events,
            )
        '''
        call = await self.state_machine.handle_event(event)
        if call and call.status in ("ended", "failed"):
            await self._cleanup_after_remote_end(call)
        if call:
            await self._notify(call)

        if event.get("type") == "StasisStart":
            channel_id = (event.get("channel") or {}).get("id")
            call = self.resolve_call_for_event(channel_id, event)
            if call:
                await self._notify(call)

    async def _notify(self, call: CallState) -> None:
        if self._broadcast:
            await self._broadcast(
                {"type": "call_update", "call": call.to_public()}
            )

    async def _cleanup_after_remote_end(self, call: CallState) -> None:
        """Cierra media y pending cuando Asterisk cuelga (canales ya caídos)."""
        call_id = call.call_id
        if call_id in self._cleaned_calls:
            return
        self._cleaned_calls.add(call_id)

        await self.media_manager.close_session(call_id)
        self._pending_outbound.pop(call_id, None)
        self._outbound_calls.pop(call_id, None)

        if call.bridge_id:
            try:
                await self.ari.delete_bridge(call.bridge_id)
            except Exception as exc:
                logger.debug("Bridge %s ya eliminado: %s", call.bridge_id, exc)
            call.bridge_id = None

    async def _remote_hangup_detected(self, call: CallState, reason: str) -> None:
        if call.status in ("ended", "failed"):
            return
        call.finalize("ended")
        logger.info("Colgado remoto call_id=%s (%s)", call.call_id, reason)
        await self._cleanup_after_remote_end(call)
        await self._notify(call)

    def get_agent_endpoint(self) -> str | None:
        if self.settings.agent_endpoint:
            return self.settings.agent_endpoint
        agent = self.agent_session.current
        if not agent:
            return None
        return self.settings.agent_endpoint_template.format(extension=agent.extension)

    def get_outbound_caller_id(self) -> str:
        agent = self.agent_session.current
        if agent:
            return f"{agent.username} <{agent.extension}>"
        return self.settings.outbound_caller_id

    async def register_agent(
        self, username: str, extension: str, password: str
    ) -> dict:
        username = username.strip()
        extension = extension.strip()
        if not username or not extension or not password:
            raise ValueError("username, extension y password son obligatorios")

        ari_ok = await self.ari_healthy()
        if not ari_ok:
            raise RuntimeError("ARI no disponible")

        endpoint = self.settings.agent_endpoint_template.format(extension=extension)
        endpoint_verified = False
        if endpoint.startswith("PJSIP/"):
            resource = endpoint.split("/", 1)[1]
            try:
                info = await self.ari.get_endpoint("PJSIP", resource)
                endpoint_verified = info is not None
            except Exception as exc:
                logger.warning(
                    "No se pudo verificar endpoint %s: %s",
                    endpoint,
                    exc,
                )

        agent = self.agent_session.register(username, extension, password)
        logger.info(
            "Agente registrado ext=%s user=%s endpoint=%s verified=%s",
            extension,
            username,
            endpoint,
            endpoint_verified,
        )
        return {
            "connected": True,
            "agent": agent.to_public(),
            "endpoint": endpoint,
            "endpoint_verified": endpoint_verified,
            "webrtc_enabled": self.settings.webrtc_enabled,
        }

    def get_agent_status(self) -> dict:
        agent = self.agent_session.current
        endpoint = self.get_agent_endpoint()
        return {
            "connected": agent is not None,
            "agent": agent.to_public() if agent else None,
            "endpoint": endpoint,
            "webrtc_enabled": self.settings.webrtc_enabled,
        }

    async def start_outbound(self, number: str) -> CallState:
        endpoint = self.settings.format_endpoint(number)
        call = CallState(
            direction="outbound",
            status="ringing",
            number=number,
        )
        self.registry.add(call)
        self._outbound_calls[call.call_id] = call
        self._cleaned_calls.discard(call.call_id)
        logger.info(
            "Llamada saliente registrada call_id=%s (registry=%d)",
            call.call_id,
            len(self.registry.list_all()),
        )

        try:
            channel = await self.ari.originate_channel(
                endpoint,
                caller_id=self.get_outbound_caller_id(),
                use_stasis=True,
                app_args=[call.call_id, "customer"],
            )
            channel_id = channel["id"]
            self.registry.link_channel(call, channel_id)
            self._pending_outbound[call.call_id] = channel_id
            asyncio.create_task(
                self._watch_outbound_channel(call.call_id, channel_id),
                name=f"watch-outbound-{call.call_id[:8]}",
            )
        except Exception as exc:
            logger.error("Originate failed: %s", exc)
            call.status = "failed"
            call.finalize("failed")

        await self._notify(call)
        return call

    async def hangup(self, call_id: str) -> bool:
        call = self.registry.get(call_id)
        if not call:
            return False

        for channel_id in list(call.channel_ids):
            try:
                await self.ari.hangup(channel_id)
            except Exception as exc:
                logger.warning("Hangup channel %s failed: %s", channel_id, exc)
        if call.external_media_channel_id and call.external_media_channel_id not in call.channel_ids:
            try:
                await self.ari.hangup(call.external_media_channel_id)
            except Exception as exc:
                logger.warning(
                    "Hangup externalMedia %s failed: %s",
                    call.external_media_channel_id,
                    exc,
                )

        call.finalize("ended")
        await self._cleanup_after_remote_end(call)
        await self._notify(call)
        return True

    def list_calls(self) -> list[CallState]:
        return self.registry.list_all()

    def get_call(self, call_id: str) -> CallState | None:
        return self.registry.get(call_id) or self._outbound_calls.get(call_id)

    async def sync_outbound_media(self, call_id: str) -> CallState | None:
        """Si el WS ARI falla, configura puente/media vía HTTP cuando el canal está Up."""
        call = self.get_call(call_id)
        if not call or call.direction != "outbound":
            return call
        if call.external_media_attached and call.bridge_id:
            return call
        channel_id = (
            self._pending_outbound.get(call_id)
            or (call.channel_ids[0] if call.channel_ids else None)
        )
        if not channel_id:
            return call
        try:
            ch = await self.ari.get_channel(channel_id)
        except Exception as exc:
            logger.debug("sync_outbound_media %s: %s", call_id, exc)
            if call.outbound_stasis_setup or call.status in ("answered", "talking"):
                await self._remote_hangup_detected(call, "canal no existe en ARI")
            return call
        if ch.get("state") != "Up":
            return call
        event = {
            "type": "StasisStart",
            "args": [call_id, "customer"],
            "channel": ch,
        }
        updated = await self.state_machine.handle_event(event)
        if updated:
            await self._notify(updated)
            return updated
        return call

    async def _watch_outbound_channel(self, call_id: str, channel_id: str) -> None:
        """Polling ARI: setup al contestar y detectar colgado remoto sin WebSocket."""
        setup_done = False
        for _ in range(600):
            await asyncio.sleep(0.5)
            call = self.get_call(call_id)
            if not call or call.status in ("ended", "failed"):
                return

            try:
                ch = await self.ari.get_channel(channel_id)
            except Exception:
                if setup_done or call.outbound_stasis_setup:
                    await self._remote_hangup_detected(
                        call, f"canal {channel_id} cerrado en Asterisk"
                    )
                return

            state = ch.get("state")
            if state == "Up":
                if not setup_done:
                    logger.info(
                        "Canal %s Up — setup por polling (call_id=%s)",
                        channel_id,
                        call_id,
                    )
                    await self.sync_outbound_media(call_id)
                    setup_done = True
                call = self.get_call(call_id)
                if call and call.external_media_attached and call.bridge_id:
                    setup_done = True
            elif setup_done and state in ("Down", "Ringing"):
                await self._remote_hangup_detected(
                    call, f"canal cliente pasó a {state}"
                )
                return

    async def ensure_webrtc_ready(self, call_id: str) -> CallState:
        """Sesión WebRTC lista y reintento de externalMedia si hace falta."""
        call = self.registry.get(call_id) or self._outbound_calls.get(call_id)
        if not call:
            raise KeyError(call_id)
        if not self.registry.get(call_id):
            self.registry.add(call)
        if not self.settings.webrtc_enabled:
            return call

        await self.media_manager.prepare_session(call_id)
        if not call.external_media_attached:
            try:
                await self.media_manager.attach_external_media(
                    call, self.ari, self.registry
                )
            except Exception as exc:
                logger.warning(
                    "externalMedia pendiente para %s: %s",
                    call_id,
                    exc,
                )
        return call

    @property
    def ari_connected(self) -> bool:
        return self.ari_listener.connected

    @property
    def ari_events_recent(self) -> bool:
        last = self.ari_listener.last_event_at
        return last is not None and (time.monotonic() - last) < 45.0

    @property
    def ari_ws_healthy(self) -> bool:
        return self.ari_listener.connected or self.ari_events_recent

    async def ari_healthy(self) -> bool:
        return await self.ari.health_check()
