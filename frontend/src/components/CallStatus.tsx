import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme, type Theme } from "@mui/material/styles";
import type { CallState, CallStatus as Status } from "../types/call";
import { useCallDuration } from "../hooks/useCallDuration";

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
  /** Layout horizontal para el header en pantallas chicas */
  compact?: boolean;
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
  compact = false,
}: Props) {
  const theme = useTheme();
  const durationLabel = useCallDuration(call);

  if (compact) {
    if (!call) return null;

    return (
      <Box
        sx={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: webrtcDotColor(webrtcStatus, theme),
            }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ flex: "1 1 auto", minWidth: 0 }}
          >
            {WEBRTC_LABELS[webrtcStatus]}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              flexShrink: 0,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: statusColor(call.status, theme),
            }}
          >
            {durationLabel}
          </Typography>
        </Box>
        <Typography
          variant="body2"
          noWrap
          sx={{
            m: 0,
            fontWeight: 600,
            color: statusColor(call.status, theme),
          }}
        >
          {STATUS_LABELS[call.status]}
          {call.number ? ` · ${call.number}` : ""}
        </Typography>
        {webrtcError && (
          <Typography variant="caption" color="error" sx={{ display: "block" }} noWrap>
            {webrtcError}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <>
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
            <Typography
              component="dd"
              variant="h5"
              sx={{ m: 0, fontWeight: 700, color: statusColor(call.status, theme) }}
            >
              {STATUS_LABELS[call.status]} {call.number}
            </Typography>
          </Box>
          <Box>
            <Typography component="dd" sx={{ m: 0, fontVariantNumeric: "tabular-nums" }}>
              {durationLabel}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Typography color="text.secondary">Sin llamada activa</Typography>
      )}
    </>
  );
}
