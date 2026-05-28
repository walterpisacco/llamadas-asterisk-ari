import logging
from typing import Any

from ari.client import AriClient
from calls.models import CallDirection, CallState
from calls.registry import CallRegistry

logger = logging.getLogger(__name__)

PROCESSED_CHANNELS: set[str] = set()


class CallStateMachine:
    def __init__(self, ari: AriClient, registry: CallRegistry) -> None:
        self.ari = ari
        self.registry = registry

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
        if not channel_id:
            return None

        if channel_id in PROCESSED_CHANNELS:
            logger.debug("Ignoring already processed channel: %s", channel_id)
            return None
        PROCESSED_CHANNELS.add(channel_id)

        existing = self.registry.get_by_channel(channel_id)
        if existing:
            self.registry.link_channel(existing, channel_id)
            if existing.status == "ringing":
                existing.status = "ringing"
            return existing

        args = event.get("args") or []
        if args and args[0]:
            existing_by_id = self.registry.get(str(args[0]))
            if existing_by_id:
                self.registry.link_channel(existing_by_id, channel_id)
                return existing_by_id

        direction: CallDirection = "outbound" if "outbound" in args else "inbound"

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
                bridge = await self.ari.create_bridge()
                call.bridge_id = bridge["id"]
                await self.ari.add_to_bridge(bridge["id"], channel_id)
                await self.ari.answer(channel_id)
                call.status = "answered"
            except Exception as exc:
                logger.error("Failed inbound setup for %s: %s", channel_id, exc)
                call.status = "failed"

        return call

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
