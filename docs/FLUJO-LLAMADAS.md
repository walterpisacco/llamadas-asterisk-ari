# Roadmap: flujo de una llamada (inicio → fin)

Vista general de **quién habla con quién**. El frontend **nunca** toca ARI directamente.

## Arquitectura general

```mermaid
flowchart TB
    subgraph FE["🖥️ Frontend (React)"]
        UI[Dialer / CallStatus / CallList]
        Store[Zustand callStore]
        WSF[WebSocket cliente ws.ts]
        RTC[useWebRtcMedia + micrófono]
    end

    subgraph BE["⚙️ Backend (FastAPI)"]
        API[REST /api/*]
        WS[WebSocket /ws]
        CS[CallService]
        SM[CallStateMachine]
        MM[MediaManager]
        ARIc[AriClient HTTP]
        ARIw[AriEventsListener WS]
    end

    subgraph AST["📞 Asterisk"]
        ST[StasisApp]
        BR[Puente mixing]
        PJSIP[PJSIP destino ej. 1101]
        EXT[Canal externalMedia]
    end

    UI --> Store
    Store -->|POST /call, /hangup| API
    Store -->|GET /calls, /health| API
    RTC -->|SDP + ICE| API
    WSF <-->|call_update| WS
    WS --> CS
    API --> CS
    CS --> SM
    CS --> MM
    CS --> ARIc
    ARIw -->|eventos| CS
    ARIc <-->|HTTP ARI| AST
    ARIw <-->|WS /ari/events| ST
    ARIc --> ST
    ST --> BR
    BR --> PJSIP
    BR --> EXT
    MM <-->|RTP + aiortc| EXT
    RTC <-->|WebRTC| MM
```

---

## Fase 0 — Arranque (siempre activo)

| Paso | Qué pasa |
|------|----------|
| 1 | Al levantar el backend, `CallService.startup()` limpia canales viejos y **abre el WebSocket a ARI** (`AriEventsListener` → `ws://asterisk/ari/events?app=StasisApp`). |
| 2 | El frontend en `Home` ejecuta `useCallSocket()`: conecta a **`/ws`**, hace `GET /api/calls` y `GET /api/health` cada 15 s. |
| 3 | El panel muestra si ARI está conectado (`ari_connected` + `ari_reachable`). |

```mermaid
sequenceDiagram
    participant FE as 🖥️ Frontend
    participant BE as ⚙️ Backend
    participant AST as 📞 Asterisk ARI

    Note over BE,AST: Al iniciar el servidor
    BE->>AST: WS persistente /ari/events (StasisApp)
    AST-->>BE: StasisStart, ChannelStateChange, etc.

    FE->>BE: WS /ws (conexión abierta)
    FE->>BE: GET /api/health
    BE-->>FE: ari_connected, webrtc_enabled
```

---

## Fase 1 — Iniciar llamada saliente

**Acción del usuario:** botón **Llamar** en el Dialer.

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Usuario
    participant FE as 🖥️ Frontend
    participant API as 🔌 REST /api
    participant CS as CallService
    participant ARI as AriClient
    participant AST as 📞 Asterisk
    participant WS as 📡 WS /ws

    U->>FE: Clic "Llamar" (número 1101)
    FE->>API: POST /api/call {"number":"1101"}
    API->>CS: start_outbound()

    Note over CS: Crea CallState (status=ringing)<br/>call_id UUID en memoria

    opt WebRTC habilitado
        CS->>CS: MediaManager.prepare_session()<br/>socket RTP + sesión aiortc
    end

    CS->>ARI: POST /ari/channels (originate PJSIP/1101)
    ARI->>AST: Origina llamada → StasisApp
    AST-->>AST: PJSIP/1101 ringing…

    CS-->>API: call_id + status
    API-->>FE: { call_id, status }
    CS->>WS: broadcast call_update (ringing)
    WS-->>FE: actualiza Zustand + UI
```

**Detalle backend (`CallService.start_outbound`):**

1. Registra la llamada en `CallRegistry` (`ringing`).
2. Si `WEBRTC_ENABLED=true`, prepara RTP/WebRTC **antes** de que conteste el destino.
3. `originate_channel` → endpoint `PJSIP/1101`, `app=StasisApp`, `appArgs=call_id,customer`.
4. Guarda el `channel_id` de Asterisk y notifica al frontend.

---

## Fase 2 — Asterisk contesta → Stasis + puente + audio

Cuando el **destino contesta**, el canal entra en Stasis. El backend **no espera al frontend** para esto: lo maneja el **WebSocket ARI**.

```mermaid
sequenceDiagram
    autonumber
    participant AST as 📞 Asterisk
    participant ARIw as ARI Events WS
    participant SM as StateMachine
    participant ARI as AriClient HTTP
    participant MM as MediaManager
    participant WS as 📡 WS /ws
    participant FE as 🖥️ Frontend

    AST->>ARIw: StasisStart (PJSIP/1101, role=customer)
    ARIw->>SM: handle_event()
    SM->>SM: Resuelve llamada por channel_id / call_id
    SM->>ARI: create_bridge (mixing)
    SM->>ARI: addChannel (cliente al puente)

    alt WEBRTC_ENABLED
        SM->>MM: attach_external_media()
        MM->>ARI: create externalMedia → Stasis (role=media)
        AST->>ARIw: StasisStart (UnicastRTP…)
        SM->>ARI: addChannel (media al puente)
        Note over MM,AST: RTP Asterisk ↔ backend
    else AGENT_ENDPOINT definido
        SM->>ARI: originate 2ª pata (agent)
        AST->>ARIw: StasisStart (agent)
        SM->>ARI: addChannel (agente al puente)
    else Sin 2ª pata
        Note over SM: ⚠️ Solo 1 canal → sin audio bidireccional
    end

    AST->>ARIw: ChannelStateChange (Up)
    SM->>SM: status = talking
    SM->>WS: call_update
    WS-->>FE: UI: "En conversación"
```

**Estados típicos de la llamada:**

```mermaid
stateDiagram-v2
    [*] --> ringing: POST /api/call
    ringing --> answered: StasisStart + puente
    answered --> talking: Channel Up
    talking --> ended: Colgar / remoto cuelga
    ringing --> failed: Originate error
    answered --> failed: Error puente/media
    ended --> [*]
    failed --> [*]
```

---

## Fase 3 — WebRTC (voz en el navegador)

Solo si `WEBRTC_ENABLED=true`. Corre **en paralelo** cuando hay una llamada activa (`useWebRtcMedia`).

```mermaid
sequenceDiagram
    participant FE as 🖥️ Navegador
    participant API as REST /api
    participant MM as MediaManager
    participant AST as Puente Asterisk

    FE->>FE: getUserMedia (micrófono)
    FE->>API: GET /webrtc/config
    FE->>FE: RTCPeerConnection + createOffer
    FE->>API: POST /calls/{id}/webrtc/offer (SDP)
    API->>MM: apply_offer → SDP answer
    API-->>FE: SDP answer
    FE->>FE: setRemoteDescription

    loop ICE
        FE->>API: POST /webrtc/ice (candidatos)
        API->>MM: add_ice_candidate
    end

    Note over FE,AST: Audio: mic ↔ aiortc ↔ RTP ↔ externalMedia ↔ puente ↔ PJSIP/1101
```

El frontend **no** usa WebSocket para el audio; solo REST para SDP/ICE. El WebSocket del frontend es solo para **estado** de la llamada.

---

## Fase 4 — Actualizaciones en tiempo real (UI)

| Origen | Mensaje | Frontend |
|--------|---------|----------|
| Cualquier cambio en `CallService` | `{ type: "call_update", call: {...} }` vía `ConnectionManager.broadcast` | `useCallSocket` → `upsertCall` → CallStatus / CallList |
| Usuario no hace nada | Asterisk envía eventos por ARI WS | Misma ruta |

**Dos WebSockets distintos:**

| WebSocket | Entre | Para qué |
|-----------|--------|----------|
| **ARI** (`/ari/events`) | Backend ↔ Asterisk | Eventos de canales, Stasis, estados |
| **App** (`/ws`) | Frontend ↔ Backend | Estado de llamadas para la UI |

---

## Fase 5 — Finalizar llamada

**Acción:** botón **Cortar** o el remoto cuelga.

```mermaid
sequenceDiagram
    participant U as 👤 Usuario
    participant FE as 🖥️ Frontend
    participant API as REST
    participant CS as CallService
    participant ARI as AriClient
    participant AST as Asterisk
    participant WS as WS /ws

    alt Usuario corta
        U->>FE: "Cortar"
        FE->>API: POST /api/hangup { call_id }
        API->>CS: hangup()
        CS->>ARI: DELETE canales
        CS->>ARI: DELETE puente
        CS->>CS: MediaManager.close_session()
        CS->>CS: call.finalize(ended)
        CS->>WS: call_update (ended)
    else Remoto cuelga
        AST->>CS: ChannelDestroyed / StasisEnd
        CS->>CS: finalize(ended)
        CS->>WS: call_update
    end

    WS-->>FE: UI limpia llamada activa
    FE->>FE: useWebRtcMedia cierra PeerConnection
```

---

## Mapa rápido por capa

```mermaid
flowchart LR
    subgraph Paso1["1️⃣ Usuario"]
        A[Llamar]
    end
    subgraph Paso2["2️⃣ REST"]
        B[POST /call]
    end
    subgraph Paso3["3️⃣ Asterisk"]
        C[Originate PJSIP]
        D[Stasis + Bridge]
    end
    subgraph Paso4["4️⃣ Media opcional"]
        E[externalMedia + WebRTC]
    end
    subgraph Paso5["5️⃣ UI viva"]
        F[WS call_update]
    end
    subgraph Paso6["6️⃣ Fin"]
        G[POST /hangup o evento ARI]
    end

    A --> B --> C --> D --> E
    D --> F
    E --> F
    F --> G
```

---

## Archivos clave (para seguir el código)

| Capa | Archivo | Rol |
|------|---------|-----|
| UI | `frontend/src/components/Dialer.tsx` | Botones Llamar/Cortar |
| Estado FE | `frontend/src/store/callStore.ts` | `postCall`, `postHangup` |
| WS FE | `frontend/src/hooks/useCallSocket.ts` | Escucha `call_update` |
| Audio FE | `frontend/src/hooks/useWebRtcMedia.ts` | Mic + SDP/ICE |
| API | `backend/api/routes.py` | Endpoints REST |
| Orquestación | `backend/services/call_service.py` | Originate, hangup, notify |
| Lógica llamada | `backend/calls/state_machine.py` | Stasis, puente, media |
| Eventos ARI | `backend/ari/events.py` | WS hacia Asterisk |
| HTTP ARI | `backend/ari/client.py` | originate, bridge, hangup |
| Media | `backend/media/manager.py` | RTP + externalMedia + WebRTC |
| WS app | `backend/websocket/manager.py` | Broadcast al frontend |

---

## Resumen

**Frontend** pide la llamada por **REST** y se entera del progreso por **WebSocket `/ws`**; **backend** controla Asterisk por **HTTP ARI** y escucha eventos por **WebSocket ARI**; cuando el destino contesta, **Stasis** mete el canal en un **puente** y, si está activo, **externalMedia + WebRTC** conectan el navegador al audio; al colgar, se liberan canales, puente y sesión media.
