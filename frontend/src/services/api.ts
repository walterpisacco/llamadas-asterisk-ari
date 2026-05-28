import type { CallState } from "../types/call";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function postCall(number: string): Promise<{ call_id: string; status: string }> {
  return request("/call", {
    method: "POST",
    body: JSON.stringify({ number }),
  });
}

export async function postHangup(callId: string): Promise<{ ok: boolean }> {
  return request("/hangup", {
    method: "POST",
    body: JSON.stringify({ call_id: callId }),
  });
}

export async function getCalls(): Promise<{ calls: CallState[] }> {
  return request("/calls");
}

export async function getHealth(): Promise<{
  status: string;
  ari_connected: boolean;
  ari_reachable: boolean;
}> {
  return request("/health");
}
