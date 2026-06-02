import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCall,
  getWebRtcConfig,
  postWebRtcIce,
  postWebRtcOffer,
} from "../services/api";
import { useCallStore } from "../store/callStore";
import type { CallState } from "../types/call";

type WebRtcStatus = "idle" | "waiting_media" | "connecting" | "connected" | "error";

export function useWebRtcMedia(activeCall: CallState | null) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const negotiatingRef = useRef(false);
  const negotiatedCallRef = useRef<string | null>(null);
  const [status, setStatus] = useState<WebRtcStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    negotiatingRef.current = false;
    negotiatedCallRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
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

    if (
      negotiatedCallRef.current === callId &&
      pcRef.current?.connectionState === "connected"
    ) {
      setStatus("connected");
      return;
    }

    if (!activeCall.external_media_attached) {
      setStatus("waiting_media");
      setError(null);
      const upsertCall = useCallStore.getState().upsertCall;
      const poll = window.setInterval(() => {
        void getCall(callId)
          .then((detail) => {
            if (detail.external_media_attached) {
              upsertCall(detail);
            }
          })
          .catch(() => undefined);
      }, 1000);
      return () => window.clearInterval(poll);
    }

    let cancelled = false;

    async function connect() {
      if (negotiatingRef.current) return;
      negotiatingRef.current = true;
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

        pc.ontrack = (ev) => {
          const [remoteStream] = ev.streams;
          if (!remoteStream || !remoteAudioRef.current) return;
          remoteAudioRef.current.srcObject = remoteStream;
          void remoteAudioRef.current.play().catch(() => undefined);
        };

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
        negotiatedCallRef.current = callId;
        setStatus("connected");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Error WebRTC");
        }
        negotiatedCallRef.current = null;
        disconnect();
      } finally {
        negotiatingRef.current = false;
      }
    }

    const timer = window.setTimeout(() => {
      void connect();
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (negotiatedCallRef.current !== callId) {
        disconnect();
      }
    };
  }, [
    activeCall?.call_id,
    activeCall?.status,
    activeCall?.external_media_attached,
    disconnect,
  ]);

  return { webrtcStatus: status, webrtcError: error, remoteAudioRef };
}
