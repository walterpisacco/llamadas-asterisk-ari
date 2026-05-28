import { useCallback, useEffect, useRef, useState } from "react";
import {
  getWebRtcConfig,
  postWebRtcIce,
  postWebRtcOffer,
} from "../services/api";
import type { CallState } from "../types/call";

type WebRtcStatus = "idle" | "connecting" | "connected" | "error";

export function useWebRtcMedia(activeCall: CallState | null) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<WebRtcStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    const callId = activeCall?.call_id;
    const active =
      activeCall &&
      activeCall.status !== "ended" &&
      activeCall.status !== "failed";

    if (!callId || !active) {
      disconnect();
      return;
    }

    let cancelled = false;

    async function connect() {
      setStatus("connecting");
      setError(null);

      try {
        const config = await getWebRtcConfig();
        if (!config.enabled) {
          setStatus("idle");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const pc = new RTCPeerConnection({
          iceServers: config.ice_servers,
        });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.onicecandidate = (ev) => {
          if (!ev.candidate) return;
          void postWebRtcIce(callId, {
            candidate: ev.candidate.candidate,
            sdp_mid: ev.candidate.sdpMid,
            sdp_mline_index: ev.candidate.sdpMLineIndex,
          }).catch(() => undefined);
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        let answer: RTCSessionDescriptionInit | null = null;
        for (let attempt = 0; attempt < 20; attempt++) {
          try {
            answer = await postWebRtcOffer(callId, {
              sdp: offer.sdp ?? "",
              type: offer.type,
            });
            break;
          } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (
              !msg.includes("409") &&
              !msg.includes("503") &&
              !msg.includes("aún no lista") &&
              !msg.includes("externalMedia")
            ) {
              throw e;
            }
            await new Promise((r) => window.setTimeout(r, 500));
          }
        }
        if (!answer) {
          throw new Error("Sesión de media no disponible");
        }
        if (cancelled) return;

        await pc.setRemoteDescription(answer);
        setStatus("connected");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Error WebRTC");
        }
        disconnect();
      }
    }

    const timer = window.setTimeout(() => {
      void connect();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      disconnect();
    };
  }, [
    activeCall?.call_id,
    activeCall?.status,
    activeCall?.external_media_attached,
    disconnect,
  ]);

  return { webrtcStatus: status, webrtcError: error };
}
