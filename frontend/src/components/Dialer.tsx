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
    <AppCard>
      <Stack spacing={2} component="form" className="mt-4">
        <AppTextField
          id="number"
          label="Número"
          type="tel"
          value={number}
          onChange={(e) => onNumberChange(e.target.value)}
          placeholder="Ej: 9111565309188"
          disabled={hasActive || loading}
          slotProps={{ input: { sx: { fontSize: "1.125rem"}} }}
          className="w-full"
        />
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <AppButton
            type="button"
            onClick={() => startCall(number)}
            disabled={!number.trim() || hasActive || loading}
            sx={{ flex: 1, width: "auto", minWidth: 0 }}
          >
            Llamar
          </AppButton>
          <AppButton
            type="button"
            onClick={() => hangup()}
            disabled={!hasActive || loading}
            sx={{ flex: 1, width: "auto", minWidth: 0 }}
          >
            Cortar
          </AppButton>
        </Box>
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}
      </Stack>
    </AppCard>
  );
}
