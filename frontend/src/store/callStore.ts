import { create } from "zustand";
import type { CallState } from "../types/call";
import { getCalls, postCall, postHangup } from "../services/api";

interface CallStore {
  calls: Record<string, CallState>;
  activeCallId: string | null;
  loading: boolean;
  error: string | null;
  ariConnected: boolean | null;
  setAriConnected: (v: boolean) => void;
  upsertCall: (call: CallState) => void;
  setActiveCall: (callId: string | null) => void;
  fetchCalls: () => Promise<void>;
  startCall: (number: string) => Promise<void>;
  hangup: (callId?: string) => Promise<void>;
}

export const useCallStore = create<CallStore>((set, get) => ({
  calls: {},
  activeCallId: null,
  loading: false,
  error: null,
  ariConnected: null,

  setAriConnected: (v) => set({ ariConnected: v }),

  upsertCall: (call) =>
    set((state) => ({
      calls: { ...state.calls, [call.call_id]: call },
      activeCallId:
        call.status !== "ended" && call.status !== "failed"
          ? call.call_id
          : state.activeCallId === call.call_id
            ? null
            : state.activeCallId,
    })),

  setActiveCall: (callId) => set({ activeCallId: callId }),

  fetchCalls: async () => {
    try {
      const { calls } = await getCalls();
      const map: Record<string, CallState> = {};
      let active: string | null = null;
      for (const c of calls) {
        map[c.call_id] = c;
        if (c.status !== "ended" && c.status !== "failed") active = c.call_id;
      }
      set({ calls: map, activeCallId: active, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Error al cargar llamadas" });
    }
  },

  startCall: async (number) => {
    set({ loading: true, error: null });
    try {
      const result = await postCall(number);
      set({ activeCallId: result.call_id, loading: false });
      await get().fetchCalls();
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Error al llamar",
      });
    }
  },

  hangup: async (callId) => {
    const id = callId ?? get().activeCallId;
    if (!id) return;
    set({ loading: true, error: null });
    try {
      await postHangup(id);
      set({ loading: false, activeCallId: null });
      await get().fetchCalls();
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Error al colgar",
      });
    }
  },
}));
