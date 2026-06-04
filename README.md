# Llamadas — FastAPI + React + ARI

Aplicación de control de llamadas con Asterisk ARI. El frontend **nunca** se conecta directamente a ARI; todo pasa por el backend.

## ❤️ Support the Project

Si este proyecto puede ayudarte, considera colaborar en su desarrollo.

- PayPal: https://paypal.me/WPisacco

<a href='https://ko-fi.com/I7T320N9U1' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## Pantalla

markdown[![Vista Previa](https://github.com/walterpisacco/llamadas-asterisk-ari/blob/main/pantalla.png)](https://github.com/walterpisacco/llamadas-asterisk-ari/blob/main/pantalla.png)

## Arquitectura

```
React (Vite)  →  REST + WebSocket  →  FastAPI  →  ARI  →  Asterisk
```

Diagramas detallados del flujo de una llamada (frontend, backend, ARI, WebSocket): [docs/FLUJO-LLAMADAS.md](docs/FLUJO-LLAMADAS.md).

## Requisitos

- Python 3.11+
- Node.js 18+ (para el frontend)
- Asterisk con ARI habilitado y aplicación Stasis configurada

## Configuración

Copiá las variables de entorno:

```bash
cp .env.example .env
# Editá ARI_BASE_URL, ARI_USER, ARI_PASSWORD, etc.
```

### Variables principales

| Variable | Descripción |
|----------|-------------|
| `ARI_BASE_URL` | URL HTTP de ARI (ej. `http://127.0.0.1:8088`) |
| `ARI_USER` / `ARI_PASSWORD` | Credenciales ARI |
| `STASIS_APP` | Nombre de la app Stasis (default: `StasisApp`) |
| `OUTBOUND_ENDPOINT_TEMPLATE` | Plantilla del endpoint (default: `PJSIP/{number}`) |
| `WEBRTC_ENABLED` | Audio del operador en el navegador vía externalMedia (default: `true`) |
| `EXTERNAL_MEDIA_ADVERTISE_HOST` | IP:puerto RTP que Asterisk usa para hablar con el backend |
| `AGENT_ENDPOINT` | Opcional: 2.ª pata PJSIP en lugar de WebRTC |
| `CORS_ORIGINS` | Orígenes permitidos para el frontend |

## Asterisk

### ARI (`ari.conf`)

```ini
[general]
enabled = yes

[admin]
type = user
read_only = no
password = tu_password
```

### Llamadas entrantes (dialplan)

```ini
[from-trunk]
exten => _X.,1,Stasis(StasisApp)
```

### Llamadas salientes

El backend origina con `app=StasisApp` y `appArgs` para identificar la llamada. El canal entra a Stasis y los eventos actualizan el estado en tiempo real.

## Arranque

```bash
cp .env.example .env
```

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Opción A: recarga automática vía .env (DEV_RELOAD=true) y:
python main.py

# Opción B: uvicorn directo
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abrí http://localhost:5173

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/call` | Iniciar llamada saliente `{"number": "..."}` |
| `POST` | `/api/hangup` | Colgar `{"call_id": "..."}` |
| `GET` | `/api/calls` | Listar llamadas |
| `GET` | `/api/calls/{id}` | Detalle de una llamada |
| `GET` | `/api/health` | Estado del servicio y ARI |
| `WS` | `/ws` | Eventos en tiempo real (`call_update`) |

## Estructura del proyecto

```
llamadas/
├── docs/
│   └── FLUJO-LLAMADAS.md   # Roadmap llamada inicio → fin (Mermaid)
├── backend/
│   ├── api/          # REST routes
│   ├── ari/          # Cliente ARI + listener WebSocket
│   ├── calls/        # Modelos, registry, state machine
│   ├── services/     # CallService
│   ├── websocket/    # WebSocket hacia el frontend
│   └── main.py
├── frontend/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       ├── services/
│       └── store/
└── .env.example
```

## Roadmap

- Redis para estado multi-instancia
- Autenticación JWT
- Grabaciones y transcripción (Whisper/TTS)
- React Native reutilizando los mismos endpoints

##  Cómo arrancar

```bash
cd llamadas/
cp .env.example .env

cd llamadas/backend
source .venv/bin/activate
# Opción A: recarga automática vía .env (DEV_RELOAD=true) y:
python main.py

# Opción B: uvicorn directo
uvicorn main:app --reload --host 0.0.0.0 --port 8000

cd llamadas/frontend/
cp .env.example .env
npm run dev
```

## ❤️ Support the Project

Si este proyecto puede ayudarte, considera colaborar en su desarrollo.


- PayPal: https://paypal.me/WPisacco

<a href='https://ko-fi.com/I7T320N9U1' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
