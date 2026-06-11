import logging
from typing import Any

import httpx

from config import Settings, get_settings

logger = logging.getLogger(__name__)


class AriClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.settings.ari_base_url.rstrip("/"),
                auth=(self.settings.ari_user, self.settings.ari_password),
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        client = await self._get_client()
        response = await client.request(method, path, json=json, params=params)
        return response

    async def create_external_media(
        self,
        external_host: str,
        *,
        app_args: list[str] | None = None,
        fmt: str = "ulaw",
        encapsulation: str = "rtp",
        connection_type: str = "client",
        transport: str = "udp",
    ) -> dict[str, Any]:
        """Canal UnicastRTP: Asterisk envía RTP a external_host (nuestro puente WebRTC)."""
        params: dict[str, Any] = {
            "app": self.settings.stasis_app,
            "external_host": external_host,
            "format": fmt,
            "encapsulation": encapsulation,
            "connection_type": connection_type,
            "transport": transport,
            "direction": "both",
        }
        if app_args:
            params["appArgs"] = ",".join(app_args)

        response = await self._request("POST", "/ari/channels/externalMedia", params=params)
        response.raise_for_status()
        return response.json()

    async def originate_channel(
        self,
        endpoint: str,
        *,
        caller_id: str | None = None,
        use_stasis: bool = True,
        app_args: list[str] | None = None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "endpoint": endpoint,
            "callerId": caller_id or self.settings.outbound_caller_id,
        }
        if use_stasis:
            params["app"] = self.settings.stasis_app
            if app_args:
                params["appArgs"] = ",".join(app_args)
        else:
            params["context"] = self.settings.outbound_context
            params["extension"] = self.settings.outbound_extension
            params["priority"] = 1

        response = await self._request("POST", "/ari/channels", params=params)
        response.raise_for_status()
        return response.json()

    async def answer(self, channel_id: str) -> None:
        response = await self._request("POST", f"/ari/channels/{channel_id}/answer")
        if response.status_code not in (204, 200):
            response.raise_for_status()

    async def hangup(self, channel_id: str) -> None:
        response = await self._request("DELETE", f"/ari/channels/{channel_id}")
        if response.status_code not in (204, 404):
            response.raise_for_status()

    async def create_bridge(self) -> dict[str, Any]:
        response = await self._request("POST", "/ari/bridges", json={"type": "mixing"})
        response.raise_for_status()
        return response.json()

    async def add_to_bridge(self, bridge_id: str, channel_id: str) -> None:
        response = await self._request(
            "POST",
            f"/ari/bridges/{bridge_id}/addChannel",
            params={"channel": channel_id},
        )
        if response.status_code not in (204, 200):
            response.raise_for_status()

    async def delete_bridge(self, bridge_id: str) -> None:
        response = await self._request("DELETE", f"/ari/bridges/{bridge_id}")
        if response.status_code not in (204, 404):
            response.raise_for_status()

    async def get_channel(self, channel_id: str) -> dict[str, Any]:
        response = await self._request("GET", f"/ari/channels/{channel_id}")
        response.raise_for_status()
        return response.json()

    async def get_channel_variable(
        self, channel_id: str, variable: str
    ) -> str | None:
        response = await self._request(
            "GET",
            f"/ari/channels/{channel_id}/variable",
            params={"variable": variable},
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        data = response.json()
        return data.get("value")

    async def play_sound(self, channel_id: str, media: str = "sound:hello-world") -> dict[str, Any]:
        response = await self._request(
            "POST",
            f"/ari/channels/{channel_id}/play",
            params={"media": media},
        )
        response.raise_for_status()
        return response.json()

    async def get_bridge(self, bridge_id: str) -> dict[str, Any]:
        response = await self._request("GET", f"/ari/bridges/{bridge_id}")
        response.raise_for_status()
        return response.json()

    async def list_channels(self) -> list[dict[str, Any]]:
        response = await self._request("GET", "/ari/channels")
        response.raise_for_status()
        return response.json()

    async def list_bridges(self) -> list[dict[str, Any]]:
        response = await self._request("GET", "/ari/bridges")
        response.raise_for_status()
        return response.json()

    async def cleanup_all(self) -> None:
        for channel in await self.list_channels():
            try:
                await self.hangup(channel["id"])
            except Exception as exc:
                logger.warning("Failed to hangup channel %s: %s", channel.get("id"), exc)

        for bridge in await self.list_bridges():
            try:
                await self.delete_bridge(bridge["id"])
            except Exception as exc:
                logger.warning("Failed to delete bridge %s: %s", bridge.get("id"), exc)

    async def get_endpoint(self, tech: str, resource: str) -> dict[str, Any] | None:
        response = await self._request("GET", f"/ari/endpoints/{tech}/{resource}")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()

    async def health_check(self) -> bool:
        try:
            client = await self._get_client()
            response = await client.get(
                "/ari/asterisk/info",
                timeout=2.0,
            )
            return response.status_code == 200
        except Exception:
            return False
