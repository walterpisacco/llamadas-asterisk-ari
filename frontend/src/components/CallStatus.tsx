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

interface Props {
  call: CallState | null;
  ariConnected: boolean | null;
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

export default function CallStatus({ call, ariConnected }: Props) {
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: ariConnected ? "success.main" : "error.main",
          }}
        />
        <Typography variant="body2" color="text.secondary">
          ARI {ariConnected === null ? "…" : ariConnected ? "conectado" : "desconectado"}
        </Typography>
      </Box>

      {call ? (
        <Box component="dl" sx={{ m: 0, "& > div + div": { mt: 1.5 } }}>
          <Box>
            <Typography component="dt" variant="caption" color="text.secondary">
              Estado
            </Typography>
            <Typography
              component="dd"
              variant="h5"
              fontWeight={700}
              sx={{ m: 0, color: statusColor(call.status, theme) }}
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
