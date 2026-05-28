import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import create_api_router
from config import get_settings
from services.call_service import CallService
from websocket.manager import ConnectionManager
from websocket.routes import create_ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()
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
app.include_router(create_ws_router(ws_manager))
