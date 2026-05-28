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

    def finalize(self, status: CallStatus = "ended") -> None:
        self.status = status
        self.ended_at = utc_now()
        if self.ended_at and self.started_at:
            self.duration = int((self.ended_at - self.started_at).total_seconds())

    def to_public(self) -> dict:
        return self.model_dump(mode="json")
