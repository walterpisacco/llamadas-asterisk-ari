import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { alpha, useTheme } from "@mui/material/styles";
import { type FormEvent, useEffect, useState } from "react";
import AppAlert from "../components/ui/Alert";
import AppButton from "../components/ui/Button";
import AppCard from "../components/ui/Card";
import HeaderActions from "../components/HeaderActions";
import AppTextField from "../components/ui/TextField";
import { useCallStore } from "../store/callStore";
import { loadUserConfig, saveUserConfig } from "../storage/userConfig";

interface ConfigurationProps {
  mode: "light" | "dark";
  onToggleMode: () => void;
  onBack: () => void;
}

export default function Configuration({ mode, onToggleMode, onBack }: ConfigurationProps) {
  const theme = useTheme();
  const connectAgent = useCallStore((s) => s.connectAgent);
  const agentStatus = useCallStore((s) => s.agentStatus);
  const agentError = useCallStore((s) => s.agentError);

  const [username, setUsername] = useState("");
  const [extension, setExtension] = useState("");
  const [password, setPassword] = useState("");
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const config = loadUserConfig();
    if (!config) return;
    setUsername(config.username);
    setExtension(config.extension);
    setHasStoredPassword(Boolean(config.password));
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const stored = loadUserConfig();
    const plainPassword = password.trim();
    const passwordToPersist = plainPassword || stored?.password || "";

    if (!passwordToPersist) return;

    setSaving(true);
    setSaved(false);
    saveUserConfig(
      { username, extension, password: passwordToPersist },
      { passwordAlreadyHashed: !plainPassword },
    );
    setHasStoredPassword(true);
    setPassword("");
    await connectAgent();
    setSaving(false);
    setSaved(true);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Box
        component="header"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 1.5, sm: 2 },
          py: { xs: 1, md: 1.5 },
          flexShrink: 0,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          backdropFilter: "blur(8px)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <IconButton onClick={onBack} aria-label="Volver al inicio" color="inherit" edge="start">
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="h1"
            noWrap
            sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            Configuración
          </Typography>
        </Box>
        <HeaderActions mode={mode} onToggleMode={onToggleMode} showConfiguration={false} />
      </Box>

      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          px: { xs: 1, sm: 2 },
          py: { xs: 2, md: 4 },
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 480 }}>
          <AppCard sx={{ margin: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Credenciales de Asterisk
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Estos datos se usarán para conectarte automáticamente.
            </Typography>

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3} mt={4}>
                <AppTextField
                  label="Nombre de usuario"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setSaved(false);
                  }}
                  autoComplete="username"
                  required
                  fullWidth
                  
                />
                <AppTextField
                  label="Extensión de Asterisk"
                  value={extension}
                  onChange={(e) => {
                    setExtension(e.target.value);
                    setSaved(false);
                  }}
                  autoComplete="off"
                  required
                  fullWidth
                />
                <AppTextField
                  label="Contraseña de Asterisk"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setSaved(false);
                  }}
                  autoComplete="current-password"
                  required={!hasStoredPassword}
                  placeholder={hasStoredPassword ? "Contraseña guardada (MD5)" : undefined}
                  helperText={
                    hasStoredPassword
                      ? ""
                      : "Se guardará convertida a MD5 en este navegador."
                  }
                  fullWidth
                />

                {saved && agentStatus === "connected" && (
                  <AppAlert severity="success">
                    Configuración guardada y extensión conectada al servidor.
                  </AppAlert>
                )}

                {saved && agentStatus !== "connected" && (
                  <AppAlert severity="warning">
                    Configuración guardada en el navegador, pero no se pudo conectar la
                    extensión. Verificá que el backend y Asterisk estén activos.
                  </AppAlert>
                )}

                {agentError && (
                  <AppAlert severity="error">{agentError}</AppAlert>
                )}

                <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                  <AppButton type="submit" disabled={saving}>
                    {saving ? "Conectando…" : "Guardar"}
                  </AppButton>
                </Box>
              </Stack>
            </Box>
          </AppCard>
        </Box>
      </Box>
    </Box>
  );
}
