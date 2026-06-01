import type { CallState } from "../types/call";

const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const json = JSON.parse(text) as { detail?: string };
      if (json.detail) detail = json.detail;
    } catch {
      /* respuesta no JSON */
    }
    throw new Error(`${response.status}: ${detail}`);
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

export async function getCall(callId: string): Promise<CallState> {
  return request(`/calls/${callId}`);
}

export async function getHealth(): Promise<{
  status: string;
  ari_connected: boolean;
  ari_operational?: boolean;
  ari_mode?: "websocket" | "http" | "offline";
  ari_ws_connected?: boolean;
  ari_events_recent?: boolean;
  ari_reachable: boolean;
  webrtc_enabled?: boolean;
}> {
  return request("/health");
}

export interface WebRtcConfig {
  enabled: boolean;
  ice_servers: RTCIceServer[];
}

export async function getWebRtcConfig(): Promise<WebRtcConfig> {
  return request("/webrtc/config");
}

export async function postWebRtcOffer(
  callId: string,
  body: { sdp: string; type: RTCSdpType },
): Promise<{ sdp: string; type: RTCSdpType }> {
  return request(`/calls/${callId}/webrtc/offer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function postWebRtcIce(
  callId: string,
  body: {
    candidate: string;
    sdp_mid: string | null;
    sdp_mline_index: number | null;
  },
): Promise<{ ok: boolean }> {
  return request(`/calls/${callId}/webrtc/ice`, {
    method: "POST",
    body: JSON.stringify({
      candidate: body.candidate,
      sdp_mid: body.sdp_mid,
      sdp_mline_index: body.sdp_mline_index,
    }),
  });
}
