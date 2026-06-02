# Llamadas — FastAPI + React + ARI

Aplicación de control de llamadas con Asterisk ARI. El frontend **nunca** se conecta directamente a ARI; todo pasa por el backend.

## ❤️ Support the Project

Si este proyecto puede ayudarte, considera colaborar en su desarrollo.

- PayPal: https://paypal.me/WPisacco

<a href='https://ko-fi.com/I7T320N9U1' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

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
| `ARI_BASE_URL` | URL HTTP de ARI (ej. `http://172.16.22.81:8088`) |
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

## Depuración de audio (sin sonido en PJSIP)

Si la llamada **conecta** pero no se escucha audio, revisá dos capas:

### 1. Audio bidireccional (WebRTC + externalMedia)

Por defecto el panel usa **WebRTC en el navegador** y Asterisk **externalMedia** (RTP PCMU):

1. El destino (PJSIP) entra a un puente de mezcla.
2. El backend abre un puerto RTP y crea `externalMedia` hacia esa IP:puerto.
3. El navegador negocia WebRTC con el backend (`/api/calls/{id}/webrtc/offer`).
4. Voz del operador ↔ backend ↔ Asterisk ↔ destino.

Variables en `.env`:

```bash
WEBRTC_ENABLED=true
# IP del servidor Python vista desde Asterisk (obligatorio si Asterisk no es localhost)
EXTERNAL_MEDIA_ADVERTISE_HOST=172.16.22.81
```

Al llamar, el navegador pedirá permiso de **micrófono**. En el panel debe verse «Audio en navegador».

**Alternativa:** teléfono físico del operador con `AGENT_ENDPOINT=PJSIP/1000` (desactivá WebRTC con `WEBRTC_ENABLED=false`).

Si Asterisk no puede alcanzar `EXTERNAL_MEDIA_ADVERTISE_HOST`, no habrá audio aunque WebRTC diga conectado.

**Prueba rápida de RTP** (el teléfono 12 debería oír “hello-world”):

```bash
# En .env del backend
ARI_DEBUG=true
ARI_DEBUG_PLAY_SOUND=true
```

Reiniciá uvicorn, llamá al 12 y escuchá si suena el mensaje.

### 2. Strict RTP / NAT (lo que muestra tu consola Asterisk)

Mensajes como `Strict RTP learning` con dos IPs distintas (`190.210.188.245` vs `192.1.4.202`) indican que el RTP del cliente cambia de dirección (NAT/ICE). Si se fija en la IP incorrecta, puede haber silencio.

En el endpoint PJSIP del 12 conviene:

```ini
direct_media = no
rtp_symmetric = yes
force_rport = yes
rewrite_contact = yes
```

En CLI: `pjsip show endpoint 12`, `pjsip show channelstats`, `rtp set debug on`.

### Endpoints de debug (con `ARI_DEBUG=true`)

| GET | Descripción |
|-----|-------------|
| `/api/debug/channels` | Canales activos en Asterisk |
| `/api/debug/channels/{id}` | Detalle + variables RTP |
| `/api/debug/calls/{call_id}/snapshot` | Estado de la llamada + puente |

## Prueba con curl

```bash
# Health
curl http://localhost:8000/api/health

# Llamar
curl -X POST http://localhost:8000/api/call \
  -H "Content-Type: application/json" \
  -d '{"number": "9111565309188"}'

# Listar
curl http://localhost:8000/api/calls

# Colgar (reemplazá CALL_ID)
curl -X POST http://localhost:8000/api/hangup \
  -H "Content-Type: application/json" \
  -d '{"call_id": "CALL_ID"}'
```

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