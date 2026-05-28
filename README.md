# Llamadas — FastAPI + React + ARI

Aplicación de control de llamadas con Asterisk ARI. El frontend **nunca** se conecta directamente a ARI; todo pasa por el backend.

## Arquitectura

```
React (Vite)  →  REST + WebSocket  →  FastAPI  →  ARI  →  Asterisk
```

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

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
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
# 1. Configurar Asterisk
cp /var/www/html/llamadas/.env.example /var/www/html/llamadas/.env
# Editar ARI_BASE_URL, credenciales, etc.
# 2. Backend
cd /var/www/html/llamadas/backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
# 3. Frontend
cd /var/www/html/llamadas/frontend
cp .env.example .env
npm run dev