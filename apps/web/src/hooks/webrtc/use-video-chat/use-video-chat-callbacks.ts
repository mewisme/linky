import type { ChatMessage, ConnectionStatus, VideoChatActions } from "../use-video-chat-state";

import type { SignalData } from "@/lib/socket/socket";
import type { UseMediaStreamReturn } from "../use-media-stream";
import type { UsePeerConnectionReturn } from "../use-peer-connection";
import type { UseSocketSignalingReturn } from "../../socket/use-socket-signaling";
import type { UsersAPI } from "@/types/users.types";
import { iceServerCache } from "@/lib/webrtc/ice-servers-cache";
import { recoveryController } from "@/lib/webrtc/webrtc-recovery";
import { toast } from "@repo/ui/components/ui/sonner";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { useMemo } from "react";
import { useWebRTCMonitoring } from "../use-webrtc-monitoring";

interface UseVideoChatCallbacksParams {
  mediaStream: UseMediaStreamReturn;
  peerConnection: UsePeerConnectionReturn;
  socketSignaling: UseSocketSignalingReturn;
  connectionStatus: ConnectionStatus;
  iceServersRef: React.MutableRefObject<RTCIceServer[]>;
  isOffererRef: React.MutableRefObject<boolean>;
  hasShownConnectedToastRef: React.MutableRefObject<boolean>;
  isReconnectingRef: React.MutableRefObject<boolean>;
  actionsRef: React.MutableRefObject<VideoChatActions>;
  getToken: () => Promise<string | null>;
  startReconnecting: () => void;
  completeReconnection: () => void;
  resetPeerState: () => void;
  resetRuntimeState: () => void;
  refreshUserProgress: () => void;
}

export function useVideoChatCallbacks({
  mediaStream,
  peerConnection,
  socketSignaling,
  connectionStatus,
  iceServersRef,
  isOffererRef,
  hasShownConnectedToastRef,
  isReconnectingRef,
  actionsRef,
  getToken,
  startReconnecting,
  completeReconnection,
  resetPeerState,
  resetRuntimeState,
  refreshUserProgress,
}: UseVideoChatCallbacksParams) {
  const isMobile = useIsMobile();
  const monitoring = useWebRTCMonitoring();
  const peerCallbacks = useMemo(
    () => ({
      onTrack: (stream: MediaStream) => {
        actionsRef.current.setRemoteStream(stream);
        actionsRef.current.setConnectionStatus("connected");
        console.info("Received remote track:", stream.getTracks().length, "tracks");

        if (process.env.NODE_ENV === "development") {
          console.log("[VideoChatState] onTrack - remote track received", {
            isReconnecting: isReconnectingRef.current,
            hasShownToast: hasShownConnectedToastRef.current,
            connectionStatus: "connected",
          });
        }

        if (!hasShownConnectedToastRef.current && !isReconnectingRef.current) {
          hasShownConnectedToastRef.current = true;
          toast.success("You are now connected with your peer.");
        }
      },
      onIceCandidate: (candidate: RTCIceCandidate) => {
        socketSignaling.sendSignal({
          type: "ice-candidate",
          candidate: candidate.toJSON(),
        });
      },
      onConnectionStateChange: (connectionState: RTCPeerConnectionState) => {
        if (peerConnection.getIceRestartInProgress?.() && (connectionState === "disconnected" || connectionState === "connecting")) {
          return;
        }
        if (connectionState === "failed") {
          actionsRef.current.setConnectionStatus("peer-disconnected");
          hasShownConnectedToastRef.current = false;
          recoveryController.stop();
        } else if (connectionState === "connected") {
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier === "none") {
            actionsRef.current.setConnectionStatus("connected");
          } else {
            actionsRef.current.setConnectionStatus("reconnecting");
          }
          hasShownConnectedToastRef.current = true;
        } else if (connectionState === "disconnected") {
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier !== "none") {
            actionsRef.current.setConnectionStatus("reconnecting");
          } else {
            actionsRef.current.setConnectionStatus("connecting");
          }
        }
      },
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => {
        console.info("ICE connection state changed:", iceConnectionState);
        if (peerConnection.getIceRestartInProgress?.() && (iceConnectionState === "checking" || iceConnectionState === "disconnected")) {
          return;
        }
        const isInCall = connectionStatus === "connected" || connectionStatus === "reconnecting";
        const isConnecting = connectionStatus === "connecting";

        if (iceConnectionState === "failed") {
          actionsRef.current.setConnectionStatus("peer-disconnected");
          hasShownConnectedToastRef.current = false;
          recoveryController.stop();
          isReconnectingRef.current = false;
        } else if (iceConnectionState === "connected" || iceConnectionState === "completed") {
          peerConnection.setIceRestartInProgress?.(false);
          recoveryController.markIceRestartComplete();
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier === "none") {
            actionsRef.current.setConnectionStatus("connected");
            if (isReconnectingRef.current) {
              completeReconnection();
            }
          } else {
            actionsRef.current.setConnectionStatus("reconnecting");
          }
        } else if (iceConnectionState === "disconnected" || iceConnectionState === "checking") {
          if (isInCall && !isConnecting) {
            startReconnecting();
          }
          const currentTier = recoveryController.getCurrentTier();
          if (currentTier !== "none") {
            actionsRef.current.setConnectionStatus("reconnecting");
          } else {
            actionsRef.current.setConnectionStatus("connecting");
          }
        }
      },
    }),
    [socketSignaling, startReconnecting, completeReconnection, connectionStatus, peerConnection, hasShownConnectedToastRef, isReconnectingRef, actionsRef]
  );

  const socketCallbacks = useMemo(
    () => ({
      onConnect: () => {
        const isInCall = connectionStatus === "connected" || connectionStatus === "reconnecting";
        if (isInCall && isReconnectingRef.current) {
          const pc = peerConnection.getPeerConnection();
          if (pc) {
            const iceState = pc.iceConnectionState;
            if (iceState === "connected" || iceState === "completed") {
              completeReconnection();
            }
          }
        }
      },

      onDisconnect: (reason: string) => {
        console.warn("[SocketHealth] Socket disconnected:", reason);
        const isInCall = connectionStatus === "connected" || connectionStatus === "reconnecting";
        if (isInCall) {
          console.info("[SocketHealth] Disconnect during active call - will resync on reconnect");
          startReconnecting();
        }
        actionsRef.current.setConnectionStatus("peer-disconnected");
      },

      onBackendRestart: () => {
        console.warn("[BackendRestart] Resetting runtime state due to backend restart");
        resetRuntimeState();
      },

      onConnectError: () => {
        actionsRef.current.setError("Failed to connect to server. Please refresh the page.");
        toast.error("Failed to connect. Please refresh the page.");
      },

      onSessionWaiting: (data: { message: string; positionInQueue: number; queueSize: number }) => {
        actionsRef.current.setError(`Session queued - ${data.message}. Position in queue: ${data.positionInQueue}/${data.queueSize}`);
        toast(`Session queued - ${data.message}. Position in queue: ${data.positionInQueue}/${data.queueSize}`);
        actionsRef.current.setConnectionStatus("idle");
      },

      onSessionActivated: (data: { message: string }) => {
        actionsRef.current.setError(null);
        toast.success(data.message);
      },

      onJoinedQueue: (data: { message: string; queueSize: number }) => {
        console.log("Joined queue:", data);
        actionsRef.current.setConnectionStatus("searching");
      },

      onMatched: async (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => {
        if (process.env.NODE_ENV === "development") {
          console.log("[VideoChatState] onMatched - resetting reconnect flags", {
            wasReconnecting: isReconnectingRef.current,
            hadShownToast: hasShownConnectedToastRef.current,
            previousStatus: connectionStatus,
          });
        }
        isReconnectingRef.current = false;
        hasShownConnectedToastRef.current = false;

        actionsRef.current.setError(null);
        actionsRef.current.setConnectionStatus("connecting");
        actionsRef.current.setPeerInfo(data.peerInfo);
        actionsRef.current.setRemoteCameraEnabled(true);

        const localStream = mediaStream.getStream();
        if (!localStream) {
          console.error("No local stream available for match");
          return;
        }

        if (iceServersRef.current.length === 0) {
          try {
            iceServersRef.current = await iceServerCache.getIceServers(
              async () => await getToken(),
              "initial"
            );
          } catch (err) {
            console.error("ICE servers not available for match:", err);
            actionsRef.current.setError("Connection configuration not ready. Please try again.");
            return;
          }
        }

        peerConnection.initializePeerConnection(localStream, peerCallbacks);
        isOffererRef.current = data.isOfferer;

        const pc = peerConnection.getPeerConnection();
        if (pc) {
          monitoring.initializeMonitoring(pc, isMobile, {
            onNetworkQualityChange: (quality) => {
              actionsRef.current.setNetworkQuality(quality);
            },
            onVideoStalled: (stalled) => {
              actionsRef.current.setVideoStalled(stalled);
            },
            onQualityTierChange: (tier) => {
              actionsRef.current.setQualityTier(tier);
            },
          });

          recoveryController.start({
            pc,
            isOfferer: data.isOfferer,
            onIceRestart: async (offer, useRelay) => {
              peerConnection.setIceRestartInProgress?.(true);
              if (!socketSignaling.isSocketHealthy()) {
                console.warn("[Recovery] Socket unhealthy, waiting for recovery before ICE restart");
                await new Promise<void>((resolve) => {
                  const checkInterval = setInterval(() => {
                    if (socketSignaling.isSocketHealthy() || !socketSignaling.getSocket()?.connected) {
                      clearInterval(checkInterval);
                      resolve();
                    }
                  }, 500);
                  setTimeout(() => {
                    clearInterval(checkInterval);
                    resolve();
                  }, 5000);
                });
              }

              if (socketSignaling.isSocketHealthy() && socketSignaling.getSocket()?.connected) {
                socketSignaling.sendSignal({
                  type: "offer",
                  sdp: offer,
                  iceRestart: true,
                });
                console.info(`[Recovery] ICE restart offer sent (relay: ${useRelay})`);
              } else {
                console.error("[Recovery] Cannot send ICE restart - socket not healthy");
                throw new Error("Socket not healthy for ICE restart");
              }
            },
            getIceServers: async () => {
              const cached = iceServerCache.getCachedServers();
              if (cached && !iceServerCache.isExpired()) {
                console.info("[IceServerCache] Reusing cached ICE servers for ICE restart");
                return cached;
              }

              console.info("[IceServerCache] Fetching ICE servers for ICE restart (cache expired)");
              return await iceServerCache.getIceServers(
                getToken,
                "expired"
              );
            },
            recordIceRestart: () => {
              return iceServerCache.recordIceRestart();
            },
            onRecoveryStateChange: (tier) => {
              if (tier === "none") {
                if (peerConnection.getIceRestartInProgress?.()) {
                  return;
                }
                const pcState = pc.connectionState;
                const iceState = pc.iceConnectionState;
                if (pcState === "connected" && (iceState === "connected" || iceState === "completed")) {
                  actionsRef.current.setConnectionStatus("connected");
                } else {
                  actionsRef.current.setConnectionStatus("connecting");
                }
              } else {
                actionsRef.current.setConnectionStatus("reconnecting");
              }
            },
          });
        }

        if (data.isOfferer) {
          try {
            console.info("Creating offer as offerer...");
            const offer = await peerConnection.createOffer();
            socketSignaling.sendSignal({
              type: "offer",
              sdp: offer,
            });
            console.log("Offer created and sent to peer");
          } catch (err) {
            console.error("Error creating offer:", err);
            actionsRef.current.setError("Failed to establish connection. Please try again.");
            actionsRef.current.setConnectionStatus("peer-disconnected");
            recoveryController.stop();
          }
        } else {
          console.log("Waiting for offer from peer as answerer...");
        }
      },

      onSignal: async (data: SignalData) => {
        const pc = peerConnection.getPeerConnection();
        if (!pc || pc.signalingState === "closed") {
          console.warn("Signal received but peer connection not ready or closed");
          return;
        }

        try {
          if (data.type === "offer") {
            const isIceRestart = data.iceRestart === true;
            if (isIceRestart) {
              console.info("Received ICE restart offer, creating answer...");
            } else {
              console.info("Received offer, creating answer...");
            }
            const answer = await peerConnection.handleOffer(data.sdp as RTCSessionDescriptionInit, isIceRestart);
            socketSignaling.sendSignal({
              type: "answer",
              sdp: answer,
              iceRestart: isIceRestart,
            });
            console.log("Answer created and sent to peer");
            if (!isIceRestart) {
              actionsRef.current.setConnectionStatus("connecting");
            }
          } else if (data.type === "answer") {
            console.info("Received answer, setting remote description...");
            await peerConnection.handleAnswer(data.sdp as RTCSessionDescriptionInit, data.iceRestart);
            console.log("Remote description set successfully");
            if (data.iceRestart) {
              recoveryController.markIceRestartComplete();
            } else {
              const currentTier = recoveryController.getCurrentTier();
              if (currentTier === "none") {
                actionsRef.current.setConnectionStatus("connecting");
              } else {
                actionsRef.current.setConnectionStatus("reconnecting");
              }
            }
          } else if (data.type === "ice-candidate" && data.candidate) {
            console.info("Received ICE candidate, adding...");
            await peerConnection.addIceCandidate(data.candidate);
          }
        } catch (err) {
          const currentPc = peerConnection.getPeerConnection();
          if (currentPc && currentPc.signalingState !== "closed") {
            console.error("Error handling signal:", err);
            actionsRef.current.setError("Failed to process connection signal. Please try again.");
          } else {
            console.warn("Signal processing error but connection is closed, ignoring:", err);
          }
        }
      },

      onPeerLeft: (data: { message: string; queueSize?: number }) => {
        monitoring.stopMonitoring();
        recoveryController.stop();
        peerConnection.closePeer();
        isOffererRef.current = false;
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);

        if (data.queueSize !== undefined) {
          actionsRef.current.setConnectionStatus("searching");
          actionsRef.current.setError(null);
          toast(`Peer disconnected - ${data.message}`);
        } else {
          actionsRef.current.setConnectionStatus("peer-disconnected");
          toast.error(`Peer disconnected - ${data.message}`);
        }
      },

      onPeerSkipped: (data: { message: string; queueSize: number }) => {
        monitoring.stopMonitoring();
        recoveryController.stop();
        peerConnection.closePeer();
        isOffererRef.current = false;
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
        actionsRef.current.setError(null);
        toast(`Peer skipped - ${data.message}`);
        refreshUserProgress();
      },

      onSkipped: (data: { message: string; queueSize: number }) => {
        console.info("Skipped:", data.message, "Queue size:", data.queueSize);
        monitoring.stopMonitoring();
        recoveryController.stop();
        actionsRef.current.setConnectionStatus("searching");
        actionsRef.current.setRemoteStream(null);
        peerConnection.closePeer();
        isOffererRef.current = false;
        actionsRef.current.clearChatMessages();
        actionsRef.current.setRemoteMuted(false);
        refreshUserProgress();
      },

      onEndCall: (data: { message: string }) => {
        console.info("End call received from peer:", data.message);
        monitoring.stopMonitoring();
        recoveryController.stop();
        toast(`Call ended - ${data.message}`);
        isOffererRef.current = false;
        resetPeerState();
        refreshUserProgress();
      },

      onChatMessage: (data: { message: string; timestamp: number; senderId: string; senderName?: string; senderImageUrl?: string }) => {
        const socketId = socketSignaling.getSocketId();
        const newMessage: ChatMessage = {
          id: `${data.senderId}-${data.timestamp}`,
          message: data.message,
          timestamp: data.timestamp,
          senderId: data.senderId,
          senderName: data.senderName,
          senderImageUrl: data.senderImageUrl,
          isOwn: data.senderId === socketId,
        };
        actionsRef.current.addChatMessage(newMessage);
      },

      onMuteToggle: (data: { muted: boolean }) => {
        actionsRef.current.setRemoteMuted(data.muted);
      },

      onVideoToggle: (data: { videoOff: boolean }) => {
        actionsRef.current.setRemoteCameraEnabled(!data.videoOff);
      },

      onScreenShareToggle: (data: { sharing: boolean; streamId?: string }) => {
        actionsRef.current.setPeerSharingScreen(data.sharing);
      },

      onQueueTimeout: (data: { message: string }) => {
        actionsRef.current.setError(data.message);
        actionsRef.current.setConnectionStatus("idle");
        toast.error(`Queue timeout - ${data.message}`);
      },

      onError: (data: { message: string }) => {
        actionsRef.current.setError(data.message);
        toast.error(`Error - ${data.message}`);
      },

      onFavoriteAdded: (data: { from_user_id: string; from_user_name: string }) => {
        toast.success(`${data.from_user_name} added you to favorites ❤️`);
      },

      onFavoriteAddedSelf: () => {
      },

      onFavoriteRemoved: (data: { from_user_id: string; from_user_name: string }) => {
        toast(`${data.from_user_name} removed you from favorites`);
      },

      onFavoriteRemovedSelf: () => {
      },
    }),
    [
      mediaStream,
      peerConnection,
      peerCallbacks,
      socketSignaling,
      resetPeerState,
      resetRuntimeState,
      connectionStatus,
      startReconnecting,
      completeReconnection,
      refreshUserProgress,
      iceServersRef,
      isOffererRef,
      hasShownConnectedToastRef,
      isReconnectingRef,
      actionsRef,
      getToken,
      monitoring,
      isMobile,
    ]
  );

  return {
    peerCallbacks,
    socketCallbacks,
  };
}
