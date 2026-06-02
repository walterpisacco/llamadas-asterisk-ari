import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AppButton from "./ui/Button";
import AppCard from "./ui/Card";
import AppTextField from "./ui/TextField";
import { useCallStore } from "../store/callStore";

interface DialerProps {
  number: string;
  onNumberChange: (value: string) => void;
}

export default function Dialer({ number, onNumberChange }: DialerProps) {
  const { startCall, hangup, loading, activeCallId, error } = useCallStore();

  const hasActive = Boolean(activeCallId);

  return (
    <AppCard sx={{ overflow: "visible" }}>
      <Stack
        spacing={2}
        component="form"
        sx={{ mt: 2, mb: 4, minHeight: 168 }}
      >
        <Box sx={{ flexShrink: 0, pt: 3.5 }}>
          <AppTextField
            id="number"
            label="Número"
            type="tel"
            value={number}
            onChange={(e) => onNumberChange(e.target.value)}
            placeholder="Ej: 9111565309188"
            disabled={hasActive || loading}
            slotProps={{ input: { sx: { fontSize: "1.125rem" } } }}
            className="w-full"
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            flexShrink: 0,
            minHeight: 50,
          }}
        >
          <AppButton
            type="button"
            onClick={() => startCall(number)}
            disabled={!number.trim() || hasActive || loading}
            sx={{
              flex: "1 1 50%",
              width: "auto",
              minWidth: 120,
              flexShrink: 0,
              "&.Mui-disabled": { opacity: 0.55 },
            }}
          >
            Llamar
          </AppButton>
          <AppButton
            type="button"
            onClick={() => hangup()}
            disabled={!hasActive || loading}
            sx={{
              flex: "1 1 50%",
              width: "auto",
              minWidth: 120,
              flexShrink: 0,
              "&.Mui-disabled": { opacity: 0.55 },
            }}
          >
            Cortar
          </AppButton>
        </Box>
        <Box sx={{ minHeight: 24, flexShrink: 0 }}>
          {error ? (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </AppCard>
  );
}
