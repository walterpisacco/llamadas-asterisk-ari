import { useMemo, useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { useAppConnection } from "./hooks/useAppConnection";
import Configuration from "./pages/Configuration";
import Home from "./pages/Home";
import { getTheme } from "./theme";

type AppPage = "home" | "configuration";

function AppShell({
  mode,
  toggleMode,
  page,
  setPage,
}: {
  mode: "light" | "dark";
  toggleMode: () => void;
  page: AppPage;
  setPage: (page: AppPage) => void;
}) {
  useAppConnection();

  return page === "home" ? (
    <Home
      mode={mode}
      onToggleMode={toggleMode}
      onOpenConfiguration={() => setPage("configuration")}
    />
  ) : (
    <Configuration
      mode={mode}
      onToggleMode={toggleMode}
      onBack={() => setPage("home")}
    />
  );
}

export default function App() {
  const [mode, setMode] = useState<"light" | "dark">("dark");
  const [page, setPage] = useState<AppPage>("home");
  const theme = useMemo(() => getTheme(mode), [mode]);
  const toggleMode = () => setMode((m) => (m === "light" ? "dark" : "light"));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell mode={mode} toggleMode={toggleMode} page={page} setPage={setPage} />
    </ThemeProvider>
  );
}
