export type CallStatus =
  | "ringing"
  | "answered"
  | "talking"
  | "ended"
  | "failed";

export type CallDirection = "inbound" | "outbound";

export interface CallState {
  call_id: string;
  channel_ids: string[];
  bridge_id?: string | null;
  direction: CallDirection;
  status: CallStatus;
  number?: string | null;
  duration: number;
  transcript: string[];
  agent_state?: string | null;
  started_at: string;
  ended_at?: string | null;
}

export interface CallUpdateMessage {
  type: "call_update";
  call: CallState;
}
