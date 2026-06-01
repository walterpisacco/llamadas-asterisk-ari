import { useEffect } from "react";
import { CallWebSocket } from "../services/ws";
import { useCallStore } from "../store/callStore";
import { getCall, getHealth } from "../services/api";

export function useCallSocket() {
  const upsertCall = useCallStore((s) => s.upsertCall);
  const fetchCalls = useCallStore((s) => s.fetchCalls);
  const setAriHealth = useCallStore((s) => s.setAriHealth);

  useEffect(() => {
    fetchCalls();
    const applyHealth = (h: Awaited<ReturnType<typeof getHealth>>) => {
      const operational = Boolean(h.ari_operational ?? h.ari_reachable);
      const ws = Boolean(h.ari_ws_connected);
      const mode = h.ari_mode ?? (operational ? (ws ? "websocket" : "http") : "offline");
      setAriHealth(operational, ws, mode);
    };

    getHealth().then(applyHealth).catch(() => setAriHealth(false, false, "offline"));

    const socket = new CallWebSocket();
    socket.connect((msg) => upsertCall(msg.call));

    const healthInterval = setInterval(() => {
      getHealth().then(applyHealth).catch(() => setAriHealth(false, false, "offline"));
    }, 5000);

    const callPollInterval = setInterval(() => {
      const activeId = useCallStore.getState().activeCallId;
      if (!activeId) return;
      const local = useCallStore.getState().calls[activeId];
      if (local?.status === "ended" || local?.status === "failed") return;
      void getCall(activeId)
        .then((call) => upsertCall(call))
        .catch(() => undefined);
    }, 2000);

    return () => {
      clearInterval(healthInterval);
      clearInterval(callPollInterval);
      socket.disconnect();
    };
  }, [upsertCall, fetchCalls, setAriHealth]);
}
