import logging
from typing import Any

from ari.client import AriClient
from ari.debug_log import log_ari_event, summarize_channel
from calls.models import CallDirection, CallState
from calls.registry import CallRegistry
from config import Settings, get_settings
from media.manager import MediaManager

logger = logging.getLogger(__name__)

PROCESSED_CHANNELS: set[str] = set()


class CallStateMachine:
    def __init__(
        self,
        ari: AriClient,
        registry: CallRegistry,
        settings: Settings | None = None,
        media_manager: MediaManager | None = None,
    ) -> None:
        self.ari = ari
        self.registry = registry
        self.settings = settings or get_settings()
        self.media_manager = media_manager

    async def handle_event(self, event: dict[str, Any]) -> CallState | None:
        event_type = event.get("type")
        handlers = {
            "StasisStart": self._on_stasis_start,
            "StasisEnd": self._on_stasis_end,
            "ChannelStateChange": self._on_channel_state_change,
            "ChannelDestroyed": self._on_channel_destroyed,
        }
        handler = handlers.get(event_type)
        if handler:
            return await handler(event)
        return None

    async def _on_stasis_start(self, event: dict[str, Any]) -> CallState | None:
        channel = event.get("channel", {})
        channel_id = channel.get("id")
        logger.info("Evento StasisStart: %s", event)
        if not channel_id:
            return None

        if channel_id in PROCESSED_CHANNELS:
            logger.debug("Ignoring already processed channel: %s", channel_id)
            return None
        PROCESSED_CHANNELS.add(channel_id)

        existing = self._resolve_existing_call(channel_id, event)
        if existing:
            self.registry.link_channel(existing, channel_id)
            role = self._stasis_role(event)
            if existing.direction == "outbound" or role in ("customer", "agent", "media"):
                logger.info(
                    "Setup media call=%s channel=%s role=%s",
                    existing.call_id,
                    channel_id,
                    role,
                )
                await self._setup_call_media(existing, channel_id, event)
            return existing

        args = event.get("args") or []
        direction: CallDirection = (
            "outbound" if ("outbound" in args or "customer" in args) else "inbound"
        )

        caller = channel.get("caller", {})
        number = caller.get("number") or channel.get("dialplan", {}).get("exten")

        call = CallState(
            channel_ids=[channel_id],
            direction=direction,
            status="ringing",
            number=number,
        )
        self.registry.add(call)

        if direction == "inbound":
            try:
                await self._ensure_bridge(call)
                await self._add_to_call_bridge(call, channel_id)
                await self.ari.answer(channel_id)
                call.status = "answered"
                await self._attach_webrtc_or_agent(call)
            except Exception as exc:
                logger.error("Failed inbound setup for %s: %s", channel_id, exc)
                call.status = "failed"

        return call

    def _resolve_existing_call(
        self, channel_id: str, event: dict[str, Any]
    ) -> CallState | None:
        """Llamada ya registrada (p. ej. tras originate); args en Stasis suelen venir vacíos."""
        by_channel = self.registry.get_by_channel(channel_id)
        if by_channel:
            return by_channel

        args = event.get("args") or []
        if args and args[0]:
            return self.registry.get(str(args[0]))
        return None

    def _stasis_role(self, event: dict[str, Any]) -> str:
        args = event.get("args") or []
        if "media" in args:
            return "media"
        if "agent" in args:
            return "agent"
        if "customer" in args or "outbound" in args:
            return "customer"
        channel_name = (event.get("channel") or {}).get("name") or ""
        if channel_name.startswith("UnicastRTP/"):
            return "media"
        return "customer"

    async def _ensure_bridge(self, call: CallState) -> str:
        if call.bridge_id:
            return call.bridge_id
        bridge = await self.ari.create_bridge()
        call.bridge_id = bridge["id"]
        logger.info("Puente %s creado para llamada %s", bridge["id"], call.call_id)
        return call.bridge_id

    async def _add_to_call_bridge(self, call: CallState, channel_id: str) -> None:
        bridge_id = await self._ensure_bridge(call)
        await self.ari.add_to_bridge(bridge_id, channel_id)
        logger.info(
            "Canal %s añadido al puente %s (llamada %s, %d canales)",
            channel_id,
            bridge_id,
            call.call_id,
            len(call.channel_ids),
        )

    async def _originate_agent_leg(self, call: CallState) -> None:
        if not self.settings.agent_endpoint or call.agent_leg_originated:
            return
        call.agent_leg_originated = True
        try:
            channel = await self.ari.originate_channel(
                self.settings.agent_endpoint,
                caller_id=self.settings.outbound_caller_id,
                use_stasis=True,
                app_args=[call.call_id, "agent"],
            )
            self.registry.link_channel(call, channel["id"])
            logger.info(
                "Pata agente originada: %s → %s (llamada %s)",
                channel["id"],
                self.settings.agent_endpoint,
                call.call_id,
            )
        except Exception as exc:
            call.agent_leg_originated = False
            logger.error(
                "No se pudo originar pata agente para %s: %s",
                call.call_id,
                exc,
            )

    async def _attach_webrtc_or_agent(self, call: CallState) -> None:
        if (
            self.settings.webrtc_enabled
            and self.media_manager
            and not call.external_media_attached
        ):
            try:
                await self.media_manager.attach_external_media(
                    call, self.ari, self.registry
                )
            except Exception as exc:
                logger.error(
                    "externalMedia falló para %s: %s",
                    call.call_id,
                    exc,
                )
            return

        await self._originate_agent_leg(call)

    async def _setup_call_media(
        self,
        call: CallState,
        channel_id: str,
        event: dict[str, Any],
    ) -> None:
        """Puente: destino + WebRTC (externalMedia) o AGENT_ENDPOINT."""
        role = self._stasis_role(event)
        channel = event.get("channel", {})

        if role == "media":
            try:
                await self._add_to_call_bridge(call, channel_id)
            except Exception as exc:
                logger.error(
                    "Fallo al añadir externalMedia al puente (llamada %s): %s",
                    call.call_id,
                    exc,
                )
                call.status = "failed"
            return

        if role == "agent":
            try:
                await self._add_to_call_bridge(call, channel_id)
            except Exception as exc:
                logger.error(
                    "Fallo al añadir agente al puente (llamada %s): %s",
                    call.call_id,
                    exc,
                )
                call.status = "failed"
            return

        if call.outbound_stasis_setup:
            return
        call.outbound_stasis_setup = True

        if self.settings.ari_debug:
            logger.info(
                "StasisStart outbound call_id=%s channel=%s",
                call.call_id,
                summarize_channel(channel),
            )
            try:
                live = await self.ari.get_channel(channel_id)
                logger.info("Canal en vivo (ARI): %s", summarize_channel(live))
            except Exception as exc:
                logger.warning("No se pudo consultar canal %s: %s", channel_id, exc)

        try:
            await self._add_to_call_bridge(call, channel_id)
        except Exception as exc:
            logger.error(
                "Fallo al añadir cliente al puente (llamada %s): %s",
                call.call_id,
                exc,
            )
            call.status = "failed"
            return

        if call.status == "ringing":
            call.status = "answered"

        await self._attach_webrtc_or_agent(call)

        if (
            not self.settings.webrtc_enabled
            and not self.settings.agent_endpoint
        ):
            logger.warning(
                "Llamada %s: solo hay 1 canal en el puente (%s). "
                "Activá WEBRTC_ENABLED o definí AGENT_ENDPOINT.",
                call.call_id,
                channel.get("name"),
            )

        if self.settings.ari_debug_play_sound:
            try:
                playback = await self.ari.play_sound(channel_id)
                logger.info(
                    "Reproducción de prueba iniciada en %s (playback_id=%s)",
                    channel_id,
                    playback.get("id"),
                )
            except Exception as exc:
                logger.error("No se pudo reproducir sonido de prueba: %s", exc)

    async def _on_stasis_end(self, event: dict[str, Any]) -> CallState | None:
        channel = event.get("channel", {})
        channel_id = channel.get("id")
        call = self.registry.get_by_channel(channel_id) if channel_id else None
        if call and call.status not in ("ended", "failed"):
            call.finalize("ended")
        return call

    async def _on_channel_state_change(self, event: dict[str, Any]) -> CallState | None:
        channel = event.get("channel", {})
        channel_id = channel.get("id")
        state = channel.get("state")
        if not channel_id:
            return None

        call = self.registry.get_by_channel(channel_id)
        if not call:
            return None

        if state == "Up" and call.status in ("ringing", "answered"):
            call.status = "talking"
            call.agent_state = "speaking"
        elif state == "Ringing" and call.status == "ringing":
            pass
        return call

    async def _on_channel_destroyed(self, event: dict[str, Any]) -> CallState | None:
        channel = event.get("channel", {})
        channel_id = channel.get("id")
        if channel_id:
            PROCESSED_CHANNELS.discard(channel_id)

        call = self.registry.get_by_channel(channel_id) if channel_id else None
        if call and call.status not in ("ended", "failed"):
            remaining = [c for c in call.channel_ids if c != channel_id]
            if not remaining or len(call.channel_ids) <= 1:
                call.finalize("ended")
        return call
