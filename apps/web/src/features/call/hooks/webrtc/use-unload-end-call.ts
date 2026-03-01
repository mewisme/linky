/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as Sentry from "@sentry/nextjs";

import { useEffect, useRef, type RefObject } from "react";

import { recoveryController } from "@/features/call/lib/webrtc/webrtc-recovery";

export function useUnloadEndCall(
  isInActiveCall: boolean,
  getIsInActiveCall: () => boolean,
  sendEndCall: () => void,
  socketId: string | null,
  socketRef: RefObject<{ connected: boolean; emit: (event: string, ...args: any[]) => void } | null>,
  releaseOwnership?: () => void
): void {
  const hasSentUnloadSignalRef = useRef(false);

  const sendUnloadEndCall = () => {
    if (hasSentUnloadSignalRef.current) {
      Sentry.metrics.count("unload_end_call_already_sent", 1);
      return;
    }

    if (!getIsInActiveCall()) {
      Sentry.metrics.count("unload_end_call_not_in_active_call", 1);
      return;
    }

    hasSentUnloadSignalRef.current = true;
    Sentry.logger.info("TRUE EXIT detected during active call - sending end-call signal");

    releaseOwnership?.();
    recoveryController.stop();

    if (socketRef.current?.connected && socketId) {
      try {
        socketRef.current.emit("end-call");
        Sentry.logger.info("End-call sent via socket emit");
        return;
      } catch (err) {
        Sentry.logger.warn("Socket emit failed, falling back to sendBeacon", { error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    if (navigator.sendBeacon) {
      try {
        const url = "/api/video-chat/end-call-unload";
        const data = JSON.stringify({ socketId });
        const blob = new Blob([data], { type: "application/json" });

        const sent = navigator.sendBeacon(url, blob);
        if (sent) {
          Sentry.logger.info("End-call sent via sendBeacon");
          return;
        } else {
          Sentry.logger.warn("sendBeacon failed (queue full or blocked)");
        }
      } catch (err) {
        Sentry.logger.error("sendBeacon error", { error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    Sentry.logger.warn("All unload signaling methods failed");
  };

  useEffect(() => {
    if (!isInActiveCall) {
      Sentry.metrics.count("unload_end_call_not_in_active_call", 1);
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
        Sentry.logger.info("pagehide with persisted=false detected - TRUE EXIT");
        sendUnloadEndCall();
      } else if (event.persisted) {
        Sentry.logger.info("pagehide with persisted=true detected - BACKGROUNDING (ignoring)");
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
