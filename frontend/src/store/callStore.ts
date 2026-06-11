import { create } from "zustand";
import type { CallState } from "../types/call";
import { getAgentStatus, getCalls, postAgentConnect, postCall, postHangup } from "../services/api";
import { loadUserConfig } from "../storage/userConfig";

interface CallStore {
  calls: Record<string, CallState>;
  activeCallId: string | null;
  loading: boolean;
  error: string | null;
  ariOperational: boolean | null;
  ariWsConnected: boolean | null;
  ariMode: "websocket" | "http" | "offline" | null;
  agentStatus: "idle" | "connecting" | "connected" | "unconfigured" | "error";
  agentExtension: string | null;
  agentUsername: string | null;
  agentError: string | null;
  setAriHealth: (
    operational: boolean,
    wsConnected: boolean,
    mode: "websocket" | "http" | "offline",
  ) => void;
  connectAgent: () => Promise<void>;
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
  ariOperational: null,
  ariWsConnected: null,
  ariMode: null,
  agentStatus: "idle",
  agentExtension: null,
  agentUsername: null,
  agentError: null,

  connectAgent: async () => {
    const config = loadUserConfig();
    if (!config?.username || !config.extension || !config.password) {
      set({
        agentStatus: "unconfigured",
        agentExtension: null,
        agentUsername: null,
        agentError: null,
      });
      return;
    }

    set({
      agentStatus: "connecting",
      agentError: null,
      agentUsername: config.username,
      agentExtension: config.extension,
    });

    try {
      const result = await postAgentConnect(config);
      set({
        agentStatus: "connected",
        agentUsername: result.agent?.username ?? config.username,
        agentExtension: result.agent?.extension ?? config.extension,
        agentError: null,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al conectar agente";
      set({
        agentStatus: "error",
        agentError: message,
      });
      try {
        const status = await getAgentStatus();
        if (status.connected && status.agent) {
          set({
            agentStatus: "connected",
            agentUsername: status.agent.username,
            agentExtension: status.agent.extension,
            agentError: null,
          });
        }
      } catch {
        /* sin estado remoto */
      }
    }
  },

  setAriHealth: (operational, wsConnected, mode) =>
    set({
      ariOperational: operational,
      ariWsConnected: wsConnected,
      ariMode: mode,
    }),

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
