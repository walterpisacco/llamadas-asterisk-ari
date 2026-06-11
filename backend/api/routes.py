import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from calls.models import CallState
from services.call_service import CallService

logger = logging.getLogger(__name__)

router = APIRouter()


class CallRequest(BaseModel):
    number: str


class HangupRequest(BaseModel):
    call_id: str


class AgentConnectRequest(BaseModel):
    username: str
    extension: str
    password: str


class WebRtcOfferRequest(BaseModel):
    sdp: str
    type: str


class WebRtcIceRequest(BaseModel):
    candidate: str | None = None
    sdp_mid: str | None = None
    sdp_mline_index: int | None = None


def create_api_router(call_service: CallService) -> APIRouter:
    @router.post("/call")
    async def start_call(body: CallRequest) -> dict:
        call = await call_service.start_outbound(body.number)
        return {"call_id": call.call_id, "status": call.status}

    @router.post("/hangup")
    async def hangup_call(body: HangupRequest) -> dict:
        ok = await call_service.hangup(body.call_id)
        if not ok:
            raise HTTPException(status_code=404, detail="Call not found")
        return {"ok": True}

    @router.get("/calls")
    async def list_calls() -> dict:
        calls = call_service.list_calls()
        return {"calls": [c.to_public() for c in calls]}

    @router.get("/calls/{call_id}")
    async def get_call(call_id: str) -> CallState:
        call = call_service.get_call(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        if (
            call.direction == "outbound"
            and not call.external_media_attached
            and call.status not in ("ended", "failed")
        ):
            synced = await call_service.sync_outbound_media(call_id)
            if synced:
                call = synced
        return call

    @router.post("/agent/connect")
    async def agent_connect(body: AgentConnectRequest) -> dict:
        try:
            return await call_service.register_agent(
                body.username,
                body.extension,
                body.password,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

    @router.get("/agent/status")
    async def agent_status() -> dict:
        return call_service.get_agent_status()

    @router.get("/health")
    async def health() -> dict:
        ari_ok = await call_service.ari_healthy()
        listener = call_service.ari_listener
        if ari_ok and not listener.task_alive:
            listener.start()
        ws_ok = call_service.ari_ws_healthy
        mode = "websocket" if ws_ok else ("http" if ari_ok else "offline")
        return {
            "status": "ok",
            # Operativo para llamadas (HTTP ARI o WS con eventos)
            "ari_operational": ari_ok,
            "ari_connected": ari_ok,
            "ari_mode": mode,
            "ari_ws_connected": call_service.ari_connected,
            "ari_ws_task_alive": listener.task_alive,
            "ari_events_recent": call_service.ari_events_recent,
            "ari_reachable": ari_ok,
            "ari_last_error": listener.last_error,
            "webrtc_enabled": call_service.settings.webrtc_enabled,
            "agent": call_service.get_agent_status(),
        }

    @router.get("/webrtc/config")
    async def webrtc_config() -> dict:
        return {
            "enabled": call_service.settings.webrtc_enabled,
            "ice_servers": call_service.media_manager.ice_servers(),
        }

    @router.post("/calls/{call_id}/webrtc/offer")
    async def webrtc_offer(call_id: str, body: WebRtcOfferRequest) -> dict:
        if not call_service.settings.webrtc_enabled:
            raise HTTPException(status_code=400, detail="WebRTC deshabilitado")
        call = call_service.get_call(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")
        try:
            call = await call_service.ensure_webrtc_ready(call_id)
            answer = await call_service.media_manager.apply_offer(
                call_id, body.sdp, body.type
            )
        except KeyError:
            raise HTTPException(status_code=404, detail="Call not found") from None
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc
        call.webrtc_connected = True
        port = call_service.media_manager.rtp_port(call_id)
        logger.info(
            "WebRTC offer OK call_id=%s (RTP puerto %s, bridge=%s)",
            call_id,
            port,
            call.bridge_id,
        )
        await call_service._notify(call)
        return answer

    @router.post("/calls/{call_id}/webrtc/ice")
    async def webrtc_ice(call_id: str, body: WebRtcIceRequest) -> dict:
        if not call_service.settings.webrtc_enabled:
            raise HTTPException(status_code=400, detail="WebRTC deshabilitado")
        try:
            await call_service.media_manager.add_ice_candidate(
                call_id,
                body.candidate,
                body.sdp_mid,
                body.sdp_mline_index,
            )
        except KeyError:
            raise HTTPException(status_code=404, detail="Call session not found") from None
        return {"ok": True}

    return router
