import { useEffect, useState } from "react";
import type { CallState } from "../types/call";

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(s / 60);
  const remainingSeconds = s % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function elapsedSeconds(call: CallState, now: number): number {
  const startMs = new Date(call.started_at).getTime();
  if (!Number.isNaN(startMs)) {
    const endMs = call.ended_at ? new Date(call.ended_at).getTime() : now;
    if (!Number.isNaN(endMs)) {
      return Math.max(0, Math.floor((endMs - startMs) / 1000));
    }
  }
  return call.duration ?? 0;
}

/** Duración en vivo (mm:ss) a partir de started_at / ended_at. */
export function useCallDuration(call: CallState | null): string {
  const [label, setLabel] = useState("00:00");

  useEffect(() => {
    if (!call) {
      setLabel("00:00");
      return;
    }

    const tick = () => setLabel(formatDuration(elapsedSeconds(call, Date.now())));

    tick();
    if (call.status === "ended" || call.status === "failed") {
      return;
    }

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [
    call?.call_id,
    call?.started_at,
    call?.ended_at,
    call?.duration,
    call?.status,
  ]);

  return label;
}
