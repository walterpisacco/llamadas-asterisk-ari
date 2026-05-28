from calls.models import CallState


class CallRegistry:
    def __init__(self) -> None:
        self._calls: dict[str, CallState] = {}
        self._channel_index: dict[str, str] = {}

    def add(self, call: CallState) -> None:
        self._calls[call.call_id] = call
        for ch in call.channel_ids:
            self._channel_index[ch] = call.call_id

    def get(self, call_id: str) -> CallState | None:
        return self._calls.get(call_id)

    def get_by_channel(self, channel_id: str) -> CallState | None:
        call_id = self._channel_index.get(channel_id)
        if call_id:
            return self._calls.get(call_id)
        return None

    def link_channel(self, call: CallState, channel_id: str) -> None:
        call.add_channel(channel_id)
        self._channel_index[channel_id] = call.call_id

    def list_all(self) -> list[CallState]:
        return list(self._calls.values())

    def remove(self, call_id: str) -> None:
        call = self._calls.pop(call_id, None)
        if call:
            for ch in call.channel_ids:
                self._channel_index.pop(ch, None)
