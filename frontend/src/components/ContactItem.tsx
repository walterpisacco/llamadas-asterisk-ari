import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import type { Contact } from "../types/contact";

interface ContactItemProps {
  contact: Contact;
  selected: boolean;
  onSelect: (contact: Contact) => void;
}

export default function ContactItem({ contact, selected, onSelect }: ContactItemProps) {
  const theme = useTheme();

  return (
    <ButtonBase
      onClick={() => onSelect(contact)}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        textAlign: "left",
        px: 2,
        py: 1.5,
        borderRadius: 0,
        transition: theme.transitions.create(["background-color"]),
        bgcolor: selected ? alpha(theme.palette.primary.main, 0.16) : "transparent",
        borderLeft: selected
          ? `3px solid ${theme.palette.primary.main}`
          : "3px solid transparent",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, selected ? 0.2 : 0.08),
        },
      }}
    >
      <Avatar
        src={contact.avatarUrl}
        alt={contact.name}
        sx={{ width: 48, height: 48, flexShrink: 0 }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" fontWeight={600} noWrap>
          {contact.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {contact.number}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ flexShrink: 0, alignSelf: "flex-start", mt: 0.25 }}
      >
        {contact.lastContactAt}
      </Typography>
    </ButtonBase>
  );
}
