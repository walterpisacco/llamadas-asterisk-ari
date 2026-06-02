import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import type { CallState } from "../types/call";
import AppCard from "./ui/Card";

interface Props {
  calls: CallState[];
  activeCallId: string | null;
  onSelect: (callId: string) => void;
}

export default function CallList({ calls, activeCallId, onSelect }: Props) {
  const theme = useTheme();

  if (calls.length === 0) return null;

  const sorted = [...calls].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  return (
    <AppCard>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", mb: 1.5, letterSpacing: "0.08em" }}
      >
        Llamadas
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {sorted.map((call) => {
          const selected = activeCallId === call.call_id;
          return (
            <Box component="li" key={call.call_id}>
              <ButtonBase
                onClick={() => onSelect(call.call_id)}
                sx={{
                  width: "100%",
                  display: "block",
                  textAlign: "left",
                  borderRadius: `${theme.shape.borderRadius}px`,
                  px: 1.5,
                  py: 1,
                  transition: theme.transitions.create(["background-color", "box-shadow"]),
                  bgcolor: selected
                    ? alpha(theme.palette.primary.main, 0.16)
                    : "transparent",
                  boxShadow: selected
                    ? `0 0 0 1px ${alpha(theme.palette.primary.main, 0.5)}`
                    : "none",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, selected ? 0.2 : 0.08),
                  },
                }}
              >
                <Typography variant="body2" component="span" fontWeight={500}>
                  {call.number || call.call_id.slice(0, 8)}
                </Typography>
                <Typography
                  variant="body2"
                  component="span"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {call.status}
                </Typography>
                <Typography
                  variant="body2"
                  component="span"
                  sx={{ ml: 1, color: alpha(theme.palette.text.secondary, 0.7) }}
                >
                  {call.direction}
                </Typography>
              </ButtonBase>
            </Box>
          );
        })}
      </Box>
    </AppCard>
  );
}
