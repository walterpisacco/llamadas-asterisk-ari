import { useState } from "react";
import { useCallStore } from "../store/callStore";

export default function Dialer() {
  const [number, setNumber] = useState("");
  const { startCall, hangup, loading, activeCallId, error } = useCallStore();

  const hasActive = Boolean(activeCallId);

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm text-slate-400" htmlFor="number">
        Número
      </label>
      <input
        id="number"
        type="tel"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Ej: 9111565309188"
        disabled={hasActive || loading}
        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-lg focus:border-emerald-500 focus:outline-none disabled:opacity-50"
      />
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => startCall(number)}
          disabled={!number.trim() || hasActive || loading}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Llamar
        </button>
        <button
          type="button"
          onClick={() => hangup()}
          disabled={!hasActive || loading}
          className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cortar
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
