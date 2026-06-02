"""Utilidades para depurar canales y eventos ARI."""

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)


def summarize_channel(channel: dict[str, Any]) -> dict[str, Any]:
    """Extrae campos útiles del objeto channel de ARI para logs/API."""
    caller = channel.get("caller") or {}
    connected = channel.get("connected") or {}
    dialplan = channel.get("dialplan") or {}
    return {
        "id": channel.get("id"),
        "name": channel.get("name"),
        "state": channel.get("state"),
        "protocol_id": channel.get("protocol_id"),
        "caller": {
            "name": caller.get("name"),
            "number": caller.get("number"),
        },
        "connected": {
            "name": connected.get("name"),
            "number": connected.get("number"),
        },
        "dialplan": {
            "context": dialplan.get("context"),
            "exten": dialplan.get("exten"),
            "app_name": dialplan.get("app_name"),
            "app_data": dialplan.get("app_data"),
        },
        "creationtime": channel.get("creationtime"),
        "language": channel.get("language"),
    }


def summarize_event(event: dict[str, Any]) -> dict[str, Any]:
    """Resumen compacto de un evento ARI."""
    summary: dict[str, Any] = {
        "type": event.get("type"),
        "timestamp": event.get("timestamp"),
        "application": event.get("application"),
        "args": event.get("args"),
    }
    if "channel" in event:
        summary["channel"] = summarize_channel(event["channel"])
    if "bridge" in event:
        bridge = event["bridge"]
        summary["bridge"] = {
            "id": bridge.get("id"),
            "type": bridge.get("bridge_type") or bridge.get("technology"),
            "channels": bridge.get("channels"),
        }
    return summary


def log_ari_event(event: dict[str, Any], *, full: bool = False) -> None:
    if full:
        logger.debug("ARI event (full): %s", json.dumps(event, default=str))
    else:
        logger.debug("ARI event: %s", json.dumps(summarize_event(event), default=str))
