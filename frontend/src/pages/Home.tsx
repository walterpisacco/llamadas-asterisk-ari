import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useMemo } from "react";
import Dialer from "../components/Dialer";
import CallStatus from "../components/CallStatus";
import CallList from "../components/CallList";
import { useCallSocket } from "../hooks/useCallSocket";
import { useCallStore } from "../store/callStore";

interface HomeProps {
  mode: "light" | "dark";
  onToggleMode: () => void;
}

export default function Home({ mode, onToggleMode }: HomeProps) {
  useCallSocket();

  const callsMap = useCallStore((s) => s.calls);
  const activeCallId = useCallStore((s) => s.activeCallId);
  const ariConnected = useCallStore((s) => s.ariConnected);
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const calls = useMemo(() => Object.values(callsMap), [callsMap]);

  const activeCall =
    (activeCallId && callsMap[activeCallId]) ||
    calls.find((c) => c.status !== "ended" && c.status !== "failed") ||
    null;

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Box
        component="header"
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} letterSpacing="-0.02em">
            Llamadas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Panel de control ARI
          </Typography>
        </Box>
        <IconButton
          onClick={onToggleMode}
          aria-label={mode === "dark" ? "Modo claro" : "Modo oscuro"}
          color="inherit"
          size="small"
        >
          {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Dialer />
        <CallStatus call={activeCall} ariConnected={ariConnected} />
        <CallList
          calls={calls}
          activeCallId={activeCall?.call_id ?? null}
          onSelect={setActiveCall}
        />
      </Box>
    </Container>
  );
}
