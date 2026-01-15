/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, type RefObject } from "react";
import { logger } from "@/utils/logger";
import { recoveryController } from "@/lib/webrtc-recovery";

/**
 * Hook to detect TRUE page unload (tab close, reload, navigation) and send end-call signal
 * when user is in an active call.
 * 
 * CRITICAL: Distinguishes between TRUE EXIT and BACKGROUNDING:
 * - TRUE EXIT: tab close, page reload, navigation away → send end-call
 * - BACKGROUND: app switch, tab switch, minimize → DO NOTHING (call stays alive)
 * 
 * Uses browser lifecycle events correctly:
 * - beforeunload: Fires on tab close/reload (true exit)
 * - pagehide: Only triggers when persisted === false (true unload, not backgrounding)
 * - visibilitychange: NOT used (fires on backgrounding, which we want to ignore)
 */
export function useUnloadEndCall(
  isInActiveCall: () => boolean,
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

    if (!isInActiveCall()) {
      return;
    }

    hasSentUnloadSignalRef.current = true;
    logger.info("[UnloadDetection] TRUE EXIT detected during active call - sending end-call signal");

    recoveryController.stop();

    if (socketRef.current?.connected && socketId) {
      try {
        socketRef.current.emit("end-call");
        logger.info("[UnloadDetection] End-call sent via socket emit");
        return;
      } catch (err) {
        logger.warn("[UnloadDetection] Socket emit failed, falling back to sendBeacon:", err);
      }
    }

    if (navigator.sendBeacon && apiUrl) {
      try {
        const url = `${apiUrl}/api/v1/video-chat/end-call-unload`;
        const data = JSON.stringify({ socketId });
        const blob = new Blob([data], { type: "application/json" });

        const sent = navigator.sendBeacon(url, blob);
        if (sent) {
          logger.info("[UnloadDetection] End-call sent via sendBeacon");
          return;
        } else {
          logger.warn("[UnloadDetection] sendBeacon failed (queue full or blocked)");
        }
      } catch (err) {
        logger.error("[UnloadDetection] sendBeacon error:", err);
      }
    }

    logger.warn("[UnloadDetection] All unload signaling methods failed");
  };

  useEffect(() => {
    hasSentUnloadSignalRef.current = false;

    // beforeunload: Fires on tab close/reload (true exit)
    const handleBeforeUnload = (_event: BeforeUnloadEvent) => {
      if (isInActiveCall()) {
        sendUnloadEndCall();
      }
    };

    // pagehide: Only trigger on TRUE unload (persisted === false)
    // persisted === true means page is being cached/backgrounded (NOT an exit)
    const handlePageHide = (event: PageTransitionEvent) => {
      // CRITICAL: Only send end-call if persisted === false (true unload)
      // persisted === true means the page is being cached/backgrounded, NOT exiting
      if (!event.persisted && isInActiveCall()) {
        logger.info("[UnloadDetection] pagehide with persisted=false detected - TRUE EXIT");
        sendUnloadEndCall();
      } else if (event.persisted) {
        logger.info("[UnloadDetection] pagehide with persisted=true detected - BACKGROUNDING (ignoring)");
      }
    };

    // NOTE: visibilitychange is NOT used here because it fires on backgrounding
    // We only want to detect TRUE EXIT, not backgrounding

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInActiveCall, sendEndCall, socketId, socketRef]);
}
