import type { ChatMessage, VideoChatActions } from "../use-video-chat-state";

import type { UseMediaStreamReturn } from "../use-media-stream";
import type { UsePeerConnectionReturn } from "../use-peer-connection";
import type { UseSocketSignalingReturn } from "../../socket/use-socket-signaling";
import { iceServerCache } from "@/lib/webrtc/ice-servers-cache";
import { recoveryController } from "@/lib/webrtc/webrtc-recovery";
import { toast } from "@repo/ui/components/ui/sonner";
import { useCallback } from "react";

interface UseVideoChatLifecycleParams {
  user: {
    firstName?: string | null;
    username?: string | null;
    imageUrl?: string;
  } | null | undefined;
  getToken: () => Promise<string | null>;
  userSettings: { default_mute_mic?: boolean; default_disable_camera?: boolean } | null;
  authReady: boolean;
  authLoading: boolean;
  mediaStream: UseMediaStreamReturn;
  peerConnection: UsePeerConnectionReturn;
  socketSignaling: UseSocketSignalingReturn;
  iceServersRef: React.MutableRefObject<RTCIceServer[]>;
  actionsRef: React.MutableRefObject<VideoChatActions>;
  refreshUserProgress: () => void;
}

export function useVideoChatLifecycle({
  user,
  getToken,
  userSettings,
  authReady,
  authLoading,
  mediaStream,
  peerConnection,
  socketSignaling,
  iceServersRef,
  actionsRef,
  refreshUserProgress,
}: UseVideoChatLifecycleParams) {
  const resetPeerState = useCallback(() => {
    recoveryController.stop();
    iceServerCache.resetSession();
    mediaStream.releaseMedia();
    peerConnection.closePeer();
    actionsRef.current.resetPeerState();
    actionsRef.current.setLocalStream(null);
    actionsRef.current.setMuted(false);
    actionsRef.current.setVideoOff(false);
  }, [mediaStream, peerConnection, actionsRef]);

  const resetRuntimeState = useCallback(() => {
    recoveryController.stop();
    iceServerCache.resetSession();
    mediaStream.releaseMedia();
    peerConnection.closePeer();
    actionsRef.current.resetRuntimeState();
  }, [mediaStream, peerConnection, actionsRef]);

  const cleanup = useCallback(() => {
    resetPeerState();
    socketSignaling.disconnectSocket();
  }, [resetPeerState, socketSignaling]);

  const initializeConnectionRef = useCallback((
    peerCallbacks: {
      onTrack: (stream: MediaStream) => void;
      onIceCandidate: (candidate: RTCIceCandidate) => void;
      onConnectionStateChange: (connectionState: RTCPeerConnectionState) => void;
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => void;
    },
    socketCallbacks: Record<string, (...args: unknown[]) => void>
  ) => {
    return async (stream: MediaStream) => {
      peerConnection.initializePeerConnection(stream, peerCallbacks);
      await socketSignaling.initializeSocket(socketCallbacks as never);
      socketSignaling.joinQueue();
    };
  }, [peerConnection, socketSignaling]);

  const start = useCallback(async (
    peerCallbacks?: {
      onTrack: (stream: MediaStream) => void;
      onIceCandidate: (candidate: RTCIceCandidate) => void;
      onConnectionStateChange: (connectionState: RTCPeerConnectionState) => void;
      onIceConnectionStateChange: (iceConnectionState: RTCIceConnectionState) => void;
    },
    socketCallbacks?: Record<string, (...args: unknown[]) => void>
  ) => {
    try {
      actionsRef.current.setError(null);

      if (authLoading) {
        return;
      }

      if (!authReady) {
        actionsRef.current.setError("Authentication required. Please sign in.");
        return;
      }

      const token = await getToken();
      if (!token) {
        actionsRef.current.setError("Authentication required. Please sign in.");
        return;
      }

      actionsRef.current.setConnectionStatus("searching");

      if (iceServersRef.current.length === 0) {
        iceServersRef.current = await iceServerCache.getIceServers(
          getToken,
          "initial"
        );
      }

      if (iceServersRef.current.length === 0) {
        throw new Error("Failed to obtain ICE servers");
      }

      const initialMuted = userSettings?.default_mute_mic ?? false;
      const initialVideoOff = userSettings?.default_disable_camera ?? false;

      actionsRef.current.setMuted(initialMuted);
      actionsRef.current.setVideoOff(initialVideoOff);

      const stream = await mediaStream.acquireMedia(initialMuted, initialVideoOff);
      actionsRef.current.setLocalStream(stream);

      if (peerCallbacks && socketCallbacks) {
        const initialize = initializeConnectionRef(peerCallbacks, socketCallbacks);
        await initialize(stream);
      }
    } catch (err) {
      console.error("Error starting video chat:", err);
      actionsRef.current.setError(err instanceof Error ? err.message : "Failed to start video chat");
      actionsRef.current.setConnectionStatus("idle");
      cleanup();
    }
  }, [
    getToken,
    userSettings,
    mediaStream,
    cleanup,
    authReady,
    authLoading,
    iceServersRef,
    actionsRef,
    initializeConnectionRef,
  ]);

  const skip = useCallback(() => {
    peerConnection.closePeer();
    actionsRef.current.setRemoteStream(null);
    actionsRef.current.clearChatMessages();
    actionsRef.current.setRemoteMuted(false);
    socketSignaling.skipPeer();
    setTimeout(() => refreshUserProgress(), 400);
  }, [peerConnection, socketSignaling, refreshUserProgress, actionsRef]);

  const endCall = useCallback(() => {
    recoveryController.stop();
    socketSignaling.sendEndCall();
    toast("Call ended - You have ended the call.");
    resetPeerState();
    setTimeout(() => refreshUserProgress(), 400);
  }, [socketSignaling, resetPeerState, refreshUserProgress]);

  const toggleMute = useCallback(() => {
    const newMutedState = mediaStream.toggleMute();
    actionsRef.current.setMuted(newMutedState);
    socketSignaling.sendMuteToggle(newMutedState);
  }, [mediaStream, socketSignaling, actionsRef]);

  const toggleVideo = useCallback(() => {
    const newVideoOffState = mediaStream.toggleVideo();
    actionsRef.current.setVideoOff(newVideoOffState);
  }, [mediaStream, actionsRef]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;

      const timestamp = Date.now();
      const socketId = socketSignaling.getSocketId();

      const newMessage: ChatMessage = {
        id: `${socketId}-${timestamp}`,
        message: message.trim(),
        timestamp,
        senderId: socketId || "unknown",
        senderName: user?.firstName || user?.username || "You",
        senderImageUrl: user?.imageUrl,
        isOwn: true,
      };
      actionsRef.current.addChatMessage(newMessage);

      socketSignaling.sendChatMessage(message.trim(), timestamp);
    },
    [socketSignaling, user, actionsRef]
  );

  const clearError = useCallback(() => {
    actionsRef.current.setError(null);
  }, [actionsRef]);

  return {
    resetPeerState,
    resetRuntimeState,
    cleanup,
    start,
    skip,
    endCall,
    toggleMute,
    toggleVideo,
    sendMessage,
    clearError,
    initializeConnectionRef,
  };
}
