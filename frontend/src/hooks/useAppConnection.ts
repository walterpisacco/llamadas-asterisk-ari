import { useEffect } from "react";
import { useCallStore } from "../store/callStore";
import { useCallSocket } from "./useCallSocket";

export function useAppConnection() {
  const connectAgent = useCallStore((s) => s.connectAgent);

  useCallSocket();

  useEffect(() => {
    void connectAgent();
  }, [connectAgent]);
}
