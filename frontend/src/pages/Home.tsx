import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import useMediaQuery from "@mui/material/useMediaQuery";
import { alpha, useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import Dialer from "../components/Dialer";
import CallStatus from "../components/CallStatus";
import CallList from "../components/CallList";
import ContactsPanel from "../components/ContactsPanel";
import { DUMMY_CONTACTS } from "../data/dummyContacts";
import { useCallSocket } from "../hooks/useCallSocket";
import { useWebRtcMedia } from "../hooks/useWebRtcMedia";
import { useCallStore } from "../store/callStore";
import type { Contact } from "../types/contact";

interface HomeProps {
  mode: "light" | "dark";
  onToggleMode: () => void;
}

export default function Home({ mode, onToggleMode }: HomeProps) {
  useCallSocket();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [mobileShowCallPanel, setMobileShowCallPanel] = useState(false);

  const callsMap = useCallStore((s) => s.calls);
  const activeCallId = useCallStore((s) => s.activeCallId);
  const ariOperational = useCallStore((s) => s.ariOperational);
  const ariWsConnected = useCallStore((s) => s.ariWsConnected);
  const ariMode = useCallStore((s) => s.ariMode);
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const calls = useMemo(() => Object.values(callsMap), [callsMap]);

  const activeCall =
    (activeCallId && callsMap[activeCallId]) ||
    calls.find((c) => c.status !== "ended" && c.status !== "failed") ||
    null;

  const { webrtcStatus, webrtcError, remoteAudioRef } = useWebRtcMedia(activeCall);

  const ariLabel =
    ariOperational === null
      ? "…"
      : !ariOperational
        ? "desconectado"
        : ariMode === "websocket" || ariWsConnected
          ? "conectado"
          : "operativo (HTTP)";

  const selectedContact = useMemo(
    () => DUMMY_CONTACTS.find((c) => c.id === selectedContactId) ?? null,
    [selectedContactId]
  );

  useEffect(() => {
    if (!isMobile) setMobileShowCallPanel(false);
  }, [isMobile]);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setPhoneNumber(contact.number);
    if (isMobile) setMobileShowCallPanel(true);
  };

  const handleBackToContacts = () => setMobileShowCallPanel(false);

  const showContactsPanel = !isMobile || !mobileShowCallPanel;
  const showCallPanel = !isMobile || mobileShowCallPanel;

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
      <audio ref={remoteAudioRef} autoPlay playsInline hidden />
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
          <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: "-0.02em" }}>
            ARI Asterisk
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Llamadas atraves de WS
          </Typography>
        </Box>
        <CallStatus
            call={activeCall}
            webrtcStatus={webrtcStatus}
            webrtcError={webrtcError}
          />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              bgcolor: ariOperational ? "success.main" : "error.main",
            }}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            ARI {ariLabel}
          </Typography>
          <IconButton
            onClick={onToggleMode}
            aria-label={mode === "dark" ? "Modo claro" : "Modo oscuro"}
            color="inherit"
            size="small"
          >
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}>
        <Box
          sx={{
            width: { xs: "100%", md: "30%" },
            minWidth: { md: 260 },
            maxWidth: { md: 420 },
            flexShrink: 0,
            display: showContactsPanel ? "flex" : "none",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <ContactsPanel
            selectedContactId={selectedContactId}
            onSelectContact={handleSelectContact}
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflowY: "auto",
            display: showCallPanel ? "flex" : "none",
            flexDirection: "column",
            py: { xs: 1, md: 2 },
          }}
        >
          {isMobile && mobileShowCallPanel && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                pb: 1,
                flexShrink: 0,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
              }}
            >
              <IconButton
                onClick={handleBackToContacts}
                aria-label="Volver a contactos"
                color="inherit"
                edge="start"
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                {selectedContact?.name ?? "Llamada"}
              </Typography>
            </Box>
          )}
          <Dialer number={phoneNumber} onNumberChange={setPhoneNumber} />

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
