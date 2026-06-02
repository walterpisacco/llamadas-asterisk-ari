import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { alpha, useTheme } from "@mui/material/styles";
import { useMemo, useState } from "react";
import { DUMMY_CONTACTS } from "../data/dummyContacts";
import type { Contact } from "../types/contact";
import ContactItem from "./ContactItem";

interface ContactsPanelProps {
  selectedContactId: string | null;
  onSelectContact: (contact: Contact) => void;
}

export default function ContactsPanel({
  selectedContactId,
  onSelectContact,
}: ContactsPanelProps) {
  const theme = useTheme();
  const [search, setSearch] = useState("");

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DUMMY_CONTACTS;
    return DUMMY_CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.number.includes(q)
    );
  }, [search]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        backdropFilter: "blur(8px)",
        borderRight: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
          Contactos
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Buscar contactos"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                bgcolor: alpha(
                  theme.palette.mode === "dark"
                    ? theme.palette.common.white
                    : theme.palette.common.black,
                  0.06
                ),
              },
            },
          }}
        />
      </Box>

      <Box
        component="ul"
        sx={{
          listStyle: "none",
          m: 0,
          p: 0,
          flex: 1,
          overflowY: "auto",
        }}
      >
        {filteredContacts.map((contact) => (
          <Box component="li" key={contact.id}>
            <ContactItem
              contact={contact}
              selected={selectedContactId === contact.id}
              onSelect={onSelectContact}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
