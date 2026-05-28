import Dialer from "../components/Dialer";
import CallStatus from "../components/CallStatus";
import CallList from "../components/CallList";
import { useCallSocket } from "../hooks/useCallSocket";
import { useCallStore } from "../store/callStore";
import { useMemo } from "react";

export default function Home() {
  useCallSocket();

  const callsMap = useCallStore((s) => s.calls);
  const activeCallId = useCallStore((s) => s.activeCallId);
  const ariConnected = useCallStore((s) => s.ariConnected);
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const calls = useMemo(() => Object.values(callsMap), [callsMap]);

  const activeCall =
    (activeCallId && callsMap[activeCallId]) ||
    calls.find((c) => c.status !== "ended" && c.status !== "failed") ||
    null;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Llamadas</h1>
        <p className="text-sm text-slate-500">Panel de control ARI</p>
      </header>

      <Dialer />
      <CallStatus call={activeCall} ariConnected={ariConnected} />
      <CallList
        calls={calls}
        activeCallId={activeCall?.call_id ?? null}
        onSelect={setActiveCall}
      />
    </div>
  );
}
