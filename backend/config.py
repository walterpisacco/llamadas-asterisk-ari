from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ari_base_url: str = "http://127.0.0.1:8088"
    ari_user: str = "admin"
    ari_password: str = ""
    stasis_app: str = "StasisApp"
    outbound_endpoint_template: str = "PJSIP/{number}"
    outbound_context: str = "SuperAdmin"
    outbound_extension: str = "1100"
    outbound_caller_id: str = "IA Bot <1000>"
    # Segunda pata del puente (ej. PJSIP/1000). Alternativa: WebRTC + externalMedia.
    agent_endpoint: str = ""
    agent_endpoint_template: str = "PJSIP/{extension}"
    # WebRTC en el navegador ↔ Asterisk vía externalMedia (RTP/PCMU)
    webrtc_enabled: bool = True
    external_media_bind_host: str = "0.0.0.0"
    # IP:puerto que Asterisk debe alcanzar (IP del backend si Asterisk es remoto)
    external_media_advertise_host: str = "127.0.0.1"
    external_media_format: str = "ulaw"
    webrtc_stun_url: str = "stun:stun.l.google.com:19302"
    cors_origins: str = "http://localhost:5173"
    host: str = "0.0.0.0"
    port: int = 8000
    # Recarga automática al guardar archivos (solo desarrollo; usar: python main.py)
    dev_reload: bool = False
    # Depuración ARI: logs detallados de eventos y canales
    ari_debug: bool = False
    ari_debug_full_events: bool = False
    # Reproduce sound:hello-world al conectar saliente (prueba de ruta RTP)
    ari_debug_play_sound: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def ari_ws_url(self) -> str:
        base = self.ari_base_url.rstrip("/")
        if base.startswith("https://"):
            return base.replace("https://", "wss://", 1)
        return base.replace("http://", "ws://", 1)

    def format_endpoint(self, number: str) -> str:
        return self.outbound_endpoint_template.format(number=number)


@lru_cache
def get_settings() -> Settings:
    return Settings()
