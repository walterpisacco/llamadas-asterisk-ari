import { useEffect } from "react";
import { CallWebSocket } from "../services/ws";
import { useCallStore } from "../store/callStore";
import { getHealth } from "../services/api";

export function useCallSocket() {
  const upsertCall = useCallStore((s) => s.upsertCall);
  const fetchCalls = useCallStore((s) => s.fetchCalls);
  const setAriConnected = useCallStore((s) => s.setAriConnected);

  useEffect(() => {
    fetchCalls();
    getHealth()
      .then((h) => setAriConnected(h.ari_connected && h.ari_reachable))
      .catch(() => setAriConnected(false));

    const socket = new CallWebSocket();
    socket.connect((msg) => upsertCall(msg.call));

    const healthInterval = setInterval(() => {
      getHealth()
        .then((h) => setAriConnected(h.ari_connected && h.ari_reachable))
        .catch(() => setAriConnected(false));
    }, 15000);

    return () => {
      clearInterval(healthInterval);
      socket.disconnect();
    };
  }, [upsertCall, fetchCalls, setAriConnected]);
}
