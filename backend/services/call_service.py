import logging
from typing import Any, Callable, Awaitable

from ari.client import AriClient
from ari.events import AriEventsListener
from calls.models import CallState
from calls.registry import CallRegistry
from calls.state_machine import CallStateMachine, PROCESSED_CHANNELS
from config import Settings, get_settings

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
        self.state_machine = CallStateMachine(self.ari, self.registry)
        self._broadcast = broadcast
        self.ari_listener = AriEventsListener(self._handle_ari_event, self.settings)
        self._pending_outbound: dict[str, str] = {}

    def set_broadcast(self, fn: BroadcastFn) -> None:
        self._broadcast = fn

    async def startup(self) -> None:
        try:
            await self.ari.cleanup_all()
        except Exception as exc:
            logger.warning("ARI cleanup on startup failed: %s", exc)
        PROCESSED_CHANNELS.clear()
        self.ari_listener.start()

    async def shutdown(self) -> None:
        await self.ari_listener.stop()
        await self.ari.close()

    async def _handle_ari_event(self, event: dict[str, Any]) -> None:
        call = await self.state_machine.handle_event(event)
        if call:
            await self._notify(call)

        if event.get("type") == "StasisStart":
            channel = event.get("channel", {})
            channel_id = channel.get("id")
            for call_id, ch_id in list(self._pending_outbound.items()):
                if ch_id == channel_id:
                    call = self.registry.get(call_id)
                    if call:
                        await self._notify(call)
                    break

    async def _notify(self, call: CallState) -> None:
        if self._broadcast:
            await self._broadcast(
                {"type": "call_update", "call": call.to_public()}
            )

    async def start_outbound(self, number: str) -> CallState:
        endpoint = self.settings.format_endpoint(number)
        call = CallState(
            direction="outbound",
            status="ringing",
            number=number,
        )
        self.registry.add(call)

        try:
            channel = await self.ari.originate_channel(
                endpoint,
                caller_id=self.settings.outbound_caller_id,
                use_stasis=True,
                app_args=[call.call_id, "outbound"],
            )
            channel_id = channel["id"]
            self.registry.link_channel(call, channel_id)
            self._pending_outbound[call.call_id] = channel_id
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

        if call.bridge_id:
            try:
                await self.ari.delete_bridge(call.bridge_id)
            except Exception as exc:
                logger.warning("Delete bridge failed: %s", exc)

        call.finalize("ended")
        self._pending_outbound.pop(call_id, None)
        await self._notify(call)
        return True

    def list_calls(self) -> list[CallState]:
        return self.registry.list_all()

    def get_call(self, call_id: str) -> CallState | None:
        return self.registry.get(call_id)

    @property
    def ari_connected(self) -> bool:
        return self.ari_listener.connected

    async def ari_healthy(self) -> bool:
        return await self.ari.health_check()
