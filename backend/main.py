import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.debug_routes import create_debug_router
from api.routes import create_api_router
from config import get_settings
from services.call_service import CallService
from websocket.manager import ConnectionManager
from websocket.routes import create_ws_router

settings = get_settings()

logging.basicConfig(
    level=logging.DEBUG if settings.ari_debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)
ws_manager = ConnectionManager()
call_service = CallService(settings=settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    call_service.set_broadcast(ws_manager.broadcast)
    await call_service.startup()
    logger.info("Call service started (ARI app=%s)", settings.stasis_app)
    yield
    await call_service.shutdown()
    logger.info("Call service stopped")


app = FastAPI(title="Llamadas API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(create_api_router(call_service), prefix="/api")
if settings.ari_debug:
    app.include_router(create_debug_router(call_service), prefix="/api")
    logger.info("Rutas de depuración ARI habilitadas en /api/debug/*")
app.include_router(create_ws_router(ws_manager))


if __name__ == "__main__":
    from pathlib import Path

    import uvicorn

    reload_dirs = [str(Path(__file__).resolve().parent)]
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.dev_reload,
        reload_dirs=reload_dirs if settings.dev_reload else None,
    )
