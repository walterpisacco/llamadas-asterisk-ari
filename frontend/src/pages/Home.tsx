import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { alpha, useTheme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import Dialer from "../components/Dialer";
import CallStatus from "../components/CallStatus";
import CallList from "../components/CallList";
import ContactsPanel from "../components/ContactsPanel";
import { useCallSocket } from "../hooks/useCallSocket";
import { useCallStore } from "../store/callStore";
import type { Contact } from "../types/contact";

interface HomeProps {
  mode: "light" | "dark";
  onToggleMode: () => void;
}

export default function Home({ mode, onToggleMode }: HomeProps) {
  useCallSocket();
  const theme = useTheme();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const callsMap = useCallStore((s) => s.calls);
  const activeCallId = useCallStore((s) => s.activeCallId);
  const ariConnected = useCallStore((s) => s.ariConnected);
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const calls = useMemo(() => Object.values(callsMap), [callsMap]);

  const activeCall =
    (activeCallId && callsMap[activeCallId]) ||
    calls.find((c) => c.status !== "ended" && c.status !== "failed") ||
    null;

  const handleSelectContact = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setPhoneNumber(contact.number);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <Box
        component="header"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          flexShrink: 0,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.5),
          backdropFilter: "blur(8px)",
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em">
            Llamadas
          </Typography>
          <Typography variant="caption" color="text.secondary">
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

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Box sx={{ width: "30%", minWidth: 260, maxWidth: 420, flexShrink: 0 }}>
          <ContactsPanel
            selectedContactId={selectedContactId}
            onSelectContact={handleSelectContact}
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            py: 2,
          }}
        >
          <Dialer number={phoneNumber} onNumberChange={setPhoneNumber} />
          <CallStatus call={activeCall} ariConnected={ariConnected} />
          <CallList
            calls={calls}
            activeCallId={activeCall?.call_id ?? null}
            onSelect={setActiveCall}
          />
        </Box>
      </Box>
    </Box>
  );
}
