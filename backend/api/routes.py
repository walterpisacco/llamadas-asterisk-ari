from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from calls.models import CallState
from services.call_service import CallService

router = APIRouter()


class CallRequest(BaseModel):
    number: str


class HangupRequest(BaseModel):
    call_id: str


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
        return call

    @router.get("/health")
    async def health() -> dict:
        ari_ok = await call_service.ari_healthy()
        return {
            "status": "ok",
            "ari_connected": call_service.ari_connected,
            "ari_reachable": ari_ok,
        }

    return router
