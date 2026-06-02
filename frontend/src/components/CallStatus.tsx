import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme, type Theme } from "@mui/material/styles";
import type { CallState, CallStatus as Status } from "../types/call";
import AppCard from "./ui/Card";

const STATUS_LABELS: Record<Status, string> = {
  ringing: "Ringing",
  answered: "Connected",
  talking: "Talking",
  ended: "Ended",
  failed: "Failed",
};

type WebRtcStatus = "idle" | "waiting_media" | "connecting" | "connected" | "error";

const WEBRTC_LABELS: Record<WebRtcStatus, string> = {
  idle: "Inactivo",
  waiting_media: "Esperando enlace Asterisk…",
  connecting: "Conectando micrófono…",
  connected: "Audio en navegador",
  error: "Error WebRTC",
};

interface Props {
  call: CallState | null;
  webrtcStatus?: WebRtcStatus;
  webrtcError?: string | null;
}

function statusColor(status: Status, theme: Theme) {
  const map: Record<Status, string> = {
    ringing: theme.palette.warning.main,
    answered: theme.palette.info.main,
    talking: theme.palette.success.main,
    ended: theme.palette.text.secondary,
    failed: theme.palette.error.main,
  };
  return map[status];
}

function webrtcDotColor(status: WebRtcStatus, theme: Theme): string {
  if (status === "connected") return theme.palette.success.main;
  if (status === "error") return theme.palette.error.main;
  if (status === "waiting_media") return theme.palette.warning.light;
  return theme.palette.warning.main;
}

export default function CallStatus({
  call,
  webrtcStatus = "idle",
  webrtcError,
}: Props) {
  const theme = useTheme();

  return (
    <AppCard>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", mb: 2, letterSpacing: "0.08em" }}
      >
        Estado
      </Typography>
      {call && (
        <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: webrtcDotColor(webrtcStatus, theme),
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {WEBRTC_LABELS[webrtcStatus]}
            </Typography>
          </Box>
          {webrtcError && (
            <Typography variant="caption" color="error">
              {webrtcError}
            </Typography>
          )}
        </Box>
      )}
      {call ? (
        <Box component="dl" sx={{ m: 0, "& > div + div": { mt: 1.5 } }}>
          <Box>
            <Typography component="dt" variant="caption" color="text.secondary">
              Estado
            </Typography>
            <Typography
              component="dd"
              variant="h5"
              sx={{ m: 0, fontWeight: 700, color: statusColor(call.status, theme) }}
            >
              {STATUS_LABELS[call.status]}
            </Typography>
          </Box>
          {call.number && (
            <Box>
              <Typography component="dt" variant="caption" color="text.secondary">
                Número
              </Typography>
              <Typography component="dd" variant="h6" sx={{ m: 0 }}>
                {call.number}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography component="dt" variant="caption" color="text.secondary">
              Dirección
            </Typography>
            <Typography component="dd" sx={{ m: 0, textTransform: "capitalize" }}>
              {call.direction}
            </Typography>
          </Box>
          <Box>
            <Typography component="dt" variant="caption" color="text.secondary">
              Duración
            </Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {call.duration}s
            </Typography>
          </Box>
          {call.agent_state && (
            <Box>
              <Typography component="dt" variant="caption" color="text.secondary">
                Agente
              </Typography>
              <Typography component="dd" sx={{ m: 0 }}>
                {call.agent_state}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Typography color="text.secondary">Sin llamada activa</Typography>
      )}
    </AppCard>
  );
}
