import { useCallback, useEffect, useRef } from "react";

import type { ConnectionStatus } from "../use-video-chat-state";
import type { UsePeerConnectionReturn } from "../use-peer-connection";
import type { UseSocketSignalingReturn } from "../../socket/use-socket-signaling";
import { iceServerCache } from "@/lib/webrtc/ice-servers-cache";

interface UseVideoChatIceParams {
  getToken: () => Promise<string | null>;
  peerConnection: UsePeerConnectionReturn;
  socketSignaling: UseSocketSignalingReturn;
  connectionStatus: ConnectionStatus;
  authReady: boolean;
  actionsRef: React.MutableRefObject<{
    setError: (error: string | null) => void;
  }>;
}

export function useVideoChatIce({
  getToken,
  peerConnection,
  socketSignaling,
  connectionStatus,
  authReady,
  actionsRef,
}: UseVideoChatIceParams) {
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const turnCredentialRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOffererRef = useRef<boolean>(false);

  useEffect(() => {
    let mounted = true;

    async function initIceServers() {
      if (!authReady) return;

      try {
        const servers = await iceServerCache.getIceServers(getToken, "forced");
        if (mounted) {
          iceServersRef.current = servers;
        }
      } catch (err) {
        console.error("Failed to fetch ICE servers:", err);
        if (mounted && authReady) {
          actionsRef.current.setError("Failed to initialize connection. Please refresh the page.");
        }
      }
    }

    initIceServers();

    return () => {
      mounted = false;
    };
  }, [authReady, getToken, actionsRef]);

  const refreshTurnCredentials = useCallback(async () => {
    const pc = peerConnection.getPeerConnection();
    if (!pc || pc.signalingState === "closed") {
      return;
    }

    if (!iceServerCache.isExpired()) {
      return;
    }

    const isInActiveCall = connectionStatus === "connected" || connectionStatus === "reconnecting";

    try {
      console.info("[IceServerCache] Refreshing TURN credentials before expiration");
      const newServers = await iceServerCache.getIceServers(
        async () => await getToken(),
        "expired"
      );

      if (newServers.length === 0) {
        console.warn("[IceServerCache] Failed to fetch new TURN credentials");
        return;
      }

      await peerConnection.updateIceServers(newServers);
      iceServersRef.current = newServers;

      if (isInActiveCall && isOffererRef.current) {
        if (!iceServerCache.recordIceRestart()) {
          console.warn("[IceServerCache] ICE restart limit exceeded, skipping restart after credential refresh");
          return;
        }

        console.info("[IceServerCache] TURN credentials refreshed during active call, initiating ICE restart");
        try {
          const restartOffer = await peerConnection.restartIce();
          socketSignaling.sendSignal({
            type: "offer",
            sdp: restartOffer,
            iceRestart: true,
          });
          console.info("[IceServerCache] ICE restart offer sent after TURN credential refresh");
        } catch (err) {
          console.error("[IceServerCache] Failed to initiate ICE restart after credential refresh:", err);
        }
      } else {
        console.info("[IceServerCache] TURN credentials refreshed successfully");
      }
    } catch (err) {
      console.error("[IceServerCache] Error refreshing TURN credentials:", err);
    }
  }, [getToken, peerConnection, connectionStatus, socketSignaling]);

  useEffect(() => {
    if (!authReady) return;

    const checkAndRefreshCredentials = () => {
      const pc = peerConnection.getPeerConnection();
      if (pc && pc.signalingState !== "closed" && connectionStatus === "connected") {
        refreshTurnCredentials();
      }
    };

    turnCredentialRefreshTimerRef.current = setInterval(checkAndRefreshCredentials, 60_000);

    return () => {
      if (turnCredentialRefreshTimerRef.current) {
        clearInterval(turnCredentialRefreshTimerRef.current);
        turnCredentialRefreshTimerRef.current = null;
      }
    };
  }, [authReady, peerConnection, connectionStatus, refreshTurnCredentials]);

  return {
    iceServersRef,
    isOffererRef,
    refreshTurnCredentials,
  };
}
