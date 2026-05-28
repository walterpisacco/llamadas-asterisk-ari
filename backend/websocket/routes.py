import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from websocket.manager import ConnectionManager

router = APIRouter()


def create_ws_router(manager: ConnectionManager) -> APIRouter:
    @router.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await manager.connect(websocket)
        try:
            while True:
                try:
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                    if data == "ping":
                        await websocket.send_text('{"type":"pong"}')
                except asyncio.TimeoutError:
                    await websocket.send_text('{"type":"heartbeat"}')
        except WebSocketDisconnect:
            pass
        finally:
            await manager.disconnect(websocket)

    return router
