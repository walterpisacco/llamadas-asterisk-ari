import type { CallState, CallStatus as Status } from "../types/call";

const STATUS_LABELS: Record<Status, string> = {
  ringing: "Ringing",
  answered: "Connected",
  talking: "Talking",
  ended: "Ended",
  failed: "Failed",
};

const STATUS_COLORS: Record<Status, string> = {
  ringing: "text-amber-400",
  answered: "text-blue-400",
  talking: "text-emerald-400",
  ended: "text-slate-500",
  failed: "text-red-400",
};

type WebRtcStatus = "idle" | "waiting_media" | "connecting" | "connected" | "error";

interface Props {
  call: CallState | null;
  ariOperational: boolean | null;
  ariWsConnected?: boolean | null;
  ariMode?: "websocket" | "http" | "offline" | null;
  webrtcStatus?: WebRtcStatus;
  webrtcError?: string | null;
}

const WEBRTC_LABELS: Record<WebRtcStatus, string> = {
  idle: "Inactivo",
  waiting_media: "Esperando enlace Asterisk…",
  connecting: "Conectando micrófono…",
  connected: "Audio en navegador",
  error: "Error WebRTC",
};

export default function CallStatus({
  call,
  ariOperational,
  ariWsConnected = null,
  ariMode = null,
  webrtcStatus = "idle",
  webrtcError,
}: Props) {
  const ariLabel =
    ariOperational === null
      ? "…"
      : !ariOperational
        ? "ARI desconectado"
        : ariMode === "websocket" || ariWsConnected
          ? "ARI conectado"
          : "ARI operativo (HTTP)";
  const ariDotOk = Boolean(ariOperational);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-500">
        Estado
      </h2>

      <div className="mb-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              ariDotOk ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="text-slate-400">ARI {ariLabel}</span>
        </div>
        {call && (
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                webrtcStatus === "connected"
                  ? "bg-emerald-500"
                  : webrtcStatus === "error"
                    ? "bg-red-500"
                    : webrtcStatus === "waiting_media"
                      ? "bg-amber-400"
                      : "bg-amber-500"
              }`}
            />
            <span className="text-slate-400">{WEBRTC_LABELS[webrtcStatus]}</span>
          </div>
        )}
        {webrtcError && (
          <p className="text-xs text-red-400">{webrtcError}</p>
        )}
      </div>

      {call ? (
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-slate-500">Estado</dt>
            <dd className={`text-2xl font-bold ${STATUS_COLORS[call.status]}`}>
              {STATUS_LABELS[call.status]}
            </dd>
          </div>
          {call.number && (
            <div>
              <dt className="text-xs text-slate-500">Número</dt>
              <dd className="text-lg">{call.number}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-500">Dirección</dt>
            <dd className="capitalize">{call.direction}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Duración</dt>
            <dd>{call.duration}s</dd>
          </div>
          {call.agent_state && (
            <div>
              <dt className="text-xs text-slate-500">Agente</dt>
              <dd>{call.agent_state}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="text-slate-500">Sin llamada activa</p>
      )}
    </div>
  );
}
