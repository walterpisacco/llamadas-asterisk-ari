import type { CallState } from "../types/call";

interface Props {
  calls: CallState[];
  activeCallId: string | null;
  onSelect: (callId: string) => void;
}

export default function CallList({ calls, activeCallId, onSelect }: Props) {
  if (calls.length === 0) return null;

  const sorted = [...calls].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
        Llamadas
      </h2>
      <ul className="space-y-2">
        {sorted.map((call) => (
          <li key={call.call_id}>
            <button
              type="button"
              onClick={() => onSelect(call.call_id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                activeCallId === call.call_id
                  ? "bg-slate-800 ring-1 ring-emerald-600"
                  : "hover:bg-slate-800/60"
              }`}
            >
              <span className="font-medium">{call.number || call.call_id.slice(0, 8)}</span>
              <span className="ml-2 text-slate-500">{call.status}</span>
              <span className="ml-2 text-slate-600">{call.direction}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
