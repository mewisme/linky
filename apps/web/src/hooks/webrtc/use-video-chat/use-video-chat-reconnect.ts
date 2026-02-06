import { useCallback, useEffect, useRef } from "react";

import type { ConnectionStatus } from "../use-video-chat-state";
import { toast } from "@repo/ui/components/ui/sonner";

interface UseVideoChatReconnectParams {
  connectionStatus: ConnectionStatus;
  isSocketHealthy: boolean;
}

export function useVideoChatReconnect({
  connectionStatus,
  isSocketHealthy,
}: UseVideoChatReconnectParams) {
  const hasShownConnectedToastRef = useRef(false);
  const isReconnectingRef = useRef(false);

  const startReconnecting = useCallback(() => {
    const isInCall =
      connectionStatus === "matched" ||
      connectionStatus === "in_call" ||
      connectionStatus === "reconnecting";
    if (!isInCall || isReconnectingRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[ReconnectUX] startReconnecting skipped", {
          isInCall,
          isReconnecting: isReconnectingRef.current,
          connectionStatus,
        });
      }
      return;
    }

    isReconnectingRef.current = true;
    console.info("[ReconnectUX] Reconnecting toast shown");
    if (process.env.NODE_ENV === "development") {
      console.log("[ReconnectUX] startReconnecting triggered", {
        connectionStatus,
      });
    }
  }, [connectionStatus]);

  const completeReconnection = useCallback(() => {
    if (!isReconnectingRef.current) {
      if (process.env.NODE_ENV === "development") {
        console.log("[ReconnectUX] completeReconnection skipped - not reconnecting");
      }
      return;
    }

    toast.success("Reconnected");
    isReconnectingRef.current = false;
    console.info("[ReconnectUX] Reconnected toast shown");
    if (process.env.NODE_ENV === "development") {
      console.log("[ReconnectUX] completeReconnection - showing reconnected toast");
    }
  }, []);

  useEffect(() => {
    const isInCall =
      connectionStatus === "matched" ||
      connectionStatus === "in_call" ||
      connectionStatus === "reconnecting";
    if (isInCall && !isSocketHealthy && !isReconnectingRef.current) {
      console.warn("[SocketHealth] Socket unhealthy during active call");
      startReconnecting();
    }
  }, [isSocketHealthy, connectionStatus, startReconnecting]);

  return {
    hasShownConnectedToastRef,
    isReconnectingRef,
    startReconnecting,
    completeReconnection,
  };
}
