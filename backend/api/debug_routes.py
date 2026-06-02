"""Rutas de depuración ARI (solo para diagnóstico en desarrollo)."""

from fastapi import APIRouter, HTTPException

from ari.debug_log import summarize_channel
from services.call_service import CallService

router = APIRouter(prefix="/debug", tags=["debug"])


def create_debug_router(call_service: CallService) -> APIRouter:
    @router.get("/channels")
    async def list_ari_channels() -> dict:
        channels = await call_service.ari.list_channels()
        return {
            "count": len(channels),
            "channels": [summarize_channel(ch) for ch in channels],
        }

    @router.get("/channels/{channel_id}")
    async def get_ari_channel(channel_id: str) -> dict:
        try:
            channel = await call_service.ari.get_channel(channel_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        rtp_vars = {}
        for name in (
            "UNICASTRTP_LOCAL_ADDRESS",
            "UNICASTRTP_LOCAL_PORT",
            "UNICASTRTP_REMOTE_ADDRESS",
            "UNICASTRTP_REMOTE_PORT",
            "RTPAUDIOQOS",
            "RTPAUDIOQOSBRIDGED",
            "RTPAUDIOQOSJITTER",
            "RTPAUDIOQOSLOSS",
            "RTPAUDIOQOSRTT",
        ):
            try:
                value = await call_service.ari.get_channel_variable(channel_id, name)
                if value is not None:
                    rtp_vars[name] = value
            except Exception:
                pass
        return {
            "channel": summarize_channel(channel),
            "rtp_variables": rtp_vars,
        }

    @router.get("/bridges")
    async def list_ari_bridges() -> dict:
        bridges = await call_service.ari.list_bridges()
        return {"count": len(bridges), "bridges": bridges}

    @router.get("/bridges/{bridge_id}")
    async def get_ari_bridge(bridge_id: str) -> dict:
        try:
            return await call_service.ari.get_bridge(bridge_id)
        except Exception as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc

    @router.get("/calls/{call_id}/snapshot")
    async def call_snapshot(call_id: str) -> dict:
        call = call_service.get_call(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        channels = []
        for ch_id in call.channel_ids:
            try:
                ch = await call_service.ari.get_channel(ch_id)
                channels.append(summarize_channel(ch))
            except Exception as exc:
                channels.append({"id": ch_id, "error": str(exc)})
        bridge = None
        if call.bridge_id:
            try:
                bridge = await call_service.ari.get_bridge(call.bridge_id)
            except Exception as exc:
                bridge = {"id": call.bridge_id, "error": str(exc)}
        return {
            "call": call.to_public(),
            "channels": channels,
            "bridge": bridge,
            "media_note": (
                "Un puente con un solo canal no mezcla audio con otro interlocutor. "
                "Para audio bidireccional hace falta externalMedia, playback/TTS o un 2.º canal."
            ),
        }

    return router
