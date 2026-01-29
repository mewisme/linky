/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, type RefObject } from "react";

import { recoveryController } from "@/lib/webrtc/webrtc-recovery";

export function useUnloadEndCall(
  isInActiveCall: boolean,
  getIsInActiveCall: () => boolean,
  sendEndCall: () => void,
  socketId: string | null,
  socketRef: RefObject<{ connected: boolean; emit: (event: string, ...args: any[]) => void } | null>
): void {
  const hasSentUnloadSignalRef = useRef(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  const sendUnloadEndCall = () => {
    if (hasSentUnloadSignalRef.current) {
      return;
    }

    if (!getIsInActiveCall()) {
      return;
    }

    hasSentUnloadSignalRef.current = true;
    console.info("[UnloadDetection] TRUE EXIT detected during active call - sending end-call signal");

    recoveryController.stop();

    if (socketRef.current?.connected && socketId) {
      try {
        socketRef.current.emit("end-call");
        console.info("[UnloadDetection] End-call sent via socket emit");
        return;
      } catch (err) {
        console.warn("[UnloadDetection] Socket emit failed, falling back to sendBeacon:", err);
      }
    }

    if (navigator.sendBeacon && apiUrl) {
      try {
        const url = `${apiUrl}/api/v1/video-chat/end-call-unload`;
        const data = JSON.stringify({ socketId });
        const blob = new Blob([data], { type: "application/json" });

        const sent = navigator.sendBeacon(url, blob);
        if (sent) {
          console.info("[UnloadDetection] End-call sent via sendBeacon");
          return;
        } else {
          console.warn("[UnloadDetection] sendBeacon failed (queue full or blocked)");
        }
      } catch (err) {
        console.error("[UnloadDetection] sendBeacon error:", err);
      }
    }

    console.warn("[UnloadDetection] All unload signaling methods failed");
  };

  useEffect(() => {
    if (!isInActiveCall) {
      return;
    }

    hasSentUnloadSignalRef.current = false;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (getIsInActiveCall()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted && getIsInActiveCall()) {
        console.info("[UnloadDetection] pagehide with persisted=false detected - TRUE EXIT");
        sendUnloadEndCall();
      } else if (event.persisted) {
        console.info("[UnloadDetection] pagehide with persisted=true detected - BACKGROUNDING (ignoring)");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInActiveCall, getIsInActiveCall, socketId, socketRef]);
}
