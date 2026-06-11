from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class AgentCredentials:
    username: str
    extension: str
    password: str
    connected_at: datetime

    def to_public(self) -> dict:
        return {
            "username": self.username,
            "extension": self.extension,
            "connected_at": self.connected_at.isoformat(),
        }


class AgentSessionStore:
    def __init__(self) -> None:
        self._current: AgentCredentials | None = None

    @property
    def current(self) -> AgentCredentials | None:
        return self._current

    def register(self, username: str, extension: str, password: str) -> AgentCredentials:
        self._current = AgentCredentials(
            username=username.strip(),
            extension=extension.strip(),
            password=password,
            connected_at=datetime.now(timezone.utc),
        )
        return self._current

    def clear(self) -> None:
        self._current = None

    def is_connected(self) -> bool:
        return self._current is not None
