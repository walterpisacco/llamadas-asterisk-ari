from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

CallStatus = Literal["ringing", "answered", "talking", "ended", "failed"]
CallDirection = Literal["inbound", "outbound"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CallState(BaseModel):
    call_id: str = Field(default_factory=lambda: str(uuid4()))
    channel_ids: list[str] = Field(default_factory=list)
    bridge_id: str | None = None
    outbound_stasis_setup: bool = False
    agent_leg_originated: bool = False
    external_media_attached: bool = False
    external_media_channel_id: str | None = None
    webrtc_connected: bool = False
    direction: CallDirection = "outbound"
    status: CallStatus = "ringing"
    number: str | None = None
    duration: int = 0
    transcript: list[str] = Field(default_factory=list)
    agent_state: str | None = None
    started_at: datetime = Field(default_factory=utc_now)
    ended_at: datetime | None = None

    def add_channel(self, channel_id: str) -> None:
        if channel_id not in self.channel_ids:
            self.channel_ids.append(channel_id)

    def elapsed_seconds(self) -> int:
        end = self.ended_at or utc_now()
        if self.started_at:
            return max(0, int((end - self.started_at).total_seconds()))
        return self.duration

    def finalize(self, status: CallStatus = "ended") -> None:
        self.status = status
        self.ended_at = utc_now()
        self.duration = self.elapsed_seconds()

    def to_public(self) -> dict:
        data = self.model_dump(mode="json")
        data["duration"] = self.elapsed_seconds()
        return data
