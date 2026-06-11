import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import SettingsIcon from "@mui/icons-material/Settings";

interface HeaderActionsProps {
  mode: "light" | "dark";
  onToggleMode: () => void;
  ariOperational?: boolean | null;
  ariLabel?: string;
  agentStatus?: "idle" | "connecting" | "connected" | "unconfigured" | "error" | null;
  agentLabel?: string;
  showConfiguration?: boolean;
  onOpenConfiguration?: () => void;
  sx?: SxProps<Theme>;
}

export default function HeaderActions({
  mode,
  onToggleMode,
  ariOperational = null,
  ariLabel = "…",
  agentStatus,
  agentLabel,
  showConfiguration = true,
  onOpenConfiguration,
  sx,
}: HeaderActionsProps) {
  return (
    <Box
      sx={[
        {
          display: "flex",
          alignItems: "center",
          gap: { xs: 0.75, sm: 1.5 },
          flexShrink: 0,
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {agentStatus != null && agentStatus !== "idle" && (
        <>
          <Box
            component="span"
            title={agentLabel ?? `Extensión ${agentStatus}`}
            sx={{
              width: { xs: 14, sm: 18 },
              height: { xs: 14, sm: 18 },
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor:
                agentStatus === "connected"
                  ? "success.main"
                  : agentStatus === "connecting"
                    ? "warning.main"
                    : agentStatus === "unconfigured"
                      ? "text.disabled"
                      : "error.main",
            }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ display: { xs: "none", lg: "block" }, maxWidth: { lg: 160 } }}
          >
            {agentLabel ??
              (agentStatus === "connecting"
                ? "Conectando…"
                : agentStatus === "unconfigured"
                  ? "Sin configurar"
                  : agentStatus === "error"
                    ? "Error extensión"
                    : "Extensión")}
          </Typography>
        </>
      )}
      {ariOperational !== null && (
        <>
          <Box
            component="span"
            title={`ARI ${ariLabel}`}
            sx={{
              width: { xs: 14, sm: 18 },
              height: { xs: 14, sm: 18 },
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: ariOperational ? "success.main" : "error.main",
            }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ display: { xs: "none", sm: "block" }, maxWidth: { sm: 140, md: "none" } }}
          >
            ARI {ariLabel}
          </Typography>
        </>
      )}
      {showConfiguration && onOpenConfiguration && (
        <IconButton
          onClick={onOpenConfiguration}
          aria-label="Configuración"
          color="inherit"
          size="small"
        >
          <SettingsIcon />
        </IconButton>
      )}
      <IconButton
        onClick={onToggleMode}
        aria-label={mode === "dark" ? "Modo claro" : "Modo oscuro"}
        color="inherit"
        size="small"
        sx={{ ml: { xs: -0.5, sm: 0 } }}
      >
        {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Box>
  );
}
