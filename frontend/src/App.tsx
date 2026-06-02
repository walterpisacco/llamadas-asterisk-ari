import { useMemo, useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Home from "./pages/Home";
import { getTheme } from "./theme";

export default function App() {
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Home mode={mode} onToggleMode={() => setMode((m) => (m === "light" ? "dark" : "light"))} />
    </ThemeProvider>
  );
}
