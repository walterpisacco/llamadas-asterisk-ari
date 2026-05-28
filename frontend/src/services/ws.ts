import type { CallUpdateMessage } from "../types/call";

type MessageHandler = (msg: CallUpdateMessage) => void;

const WS_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

export class CallWebSocket {
  private ws: WebSocket | null = null;
  private handler: MessageHandler | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  connect(onMessage: MessageHandler): void {
    this.handler = onMessage;
    this.shouldReconnect = true;
    this.open();
  }

  private open(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type === "call_update" && this.handler) {
          this.handler(data as CallUpdateMessage);
        }
      } catch {
        /* ignore non-json */
      }
    };

    this.ws.onclose = () => {
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this.open(), 2000);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}
