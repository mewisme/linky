"use client";

import { useRef, useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { publishPresence } from "@/lib/mqtt/client";
import { type SignalData } from "@/lib/socket/socket";
import { socketHealthMonitor } from "@/lib/socket/socket-health";
import type { Socket } from "socket.io-client";
import type { UsersAPI } from "@/types/users.types";

import { useSocket } from "./use-socket";

export interface SocketCallbacks {
  onJoinedQueue: (data: { message: string; queueSize: number }) => void;
  onMatched: (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => void;
  onSignal: (data: SignalData) => void;
  onPeerLeft: (data: { message: string; queueSize?: number }) => void;
  onPeerSkipped: (data: { message: string; queueSize: number }) => void;
  onSkipped: (data: { message: string; queueSize: number }) => void;
  onEndCall: (data: { message: string }) => void;
  onChatMessage: (data: { message: string; timestamp: number; senderId: string; senderName?: string; senderImageUrl?: string }) => void;
  onMuteToggle: (data: { muted: boolean }) => void;
  onVideoToggle: (data: { videoOff: boolean }) => void;
  onScreenShareToggle: (data: { sharing: boolean; streamId?: string }) => void;
  onQueueTimeout: (data: { message: string }) => void;
  onError: (data: { message: string }) => void;
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onConnectError: (error: Error) => void;
  onBackendRestart: () => void;
  onFavoriteAdded: (data: { from_user_id: string; from_user_name: string }) => void;
  onFavoriteAddedSelf: (data: { favorite_user_id: string }) => void;
  onFavoriteRemoved: (data: { from_user_id: string; from_user_name: string }) => void;
  onFavoriteRemovedSelf: (data: { favorite_user_id: string }) => void;
}

export interface UseSocketSignalingReturn {
  initializeSocket: (callbacks: SocketCallbacks) => Promise<void>;
  sendSignal: (data: SignalData) => void;
  joinQueue: () => void;
  skipPeer: () => void;
  sendEndCall: () => void;
  sendChatMessage: (message: string, timestamp: number) => void;
  sendMuteToggle: (muted: boolean) => void;
  sendVideoToggle: (videoOff: boolean) => void;
  sendScreenShareToggle: (sharing: boolean, streamId?: string) => void;
  sendReaction: (count: number, type?: string) => void;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  removeAllListeners: () => void;
  disconnectSocket: () => void;
  getSocket: () => Socket | null;
  getSocketId: () => string | null;
  isSocketHealthy: () => boolean;
  requestResync: () => void;
  socketRef: MutableRefObject<Socket | null>;
  currentSocketIdRef: MutableRefObject<string | null>;
  isInActiveCallRef: MutableRefObject<boolean>;
}

export function useSocketSignaling(): UseSocketSignalingReturn {
  const { socket: globalSocket, registerCallbacks, unregisterCallbacks } = useSocket();
  const socketRef = useRef<Socket | null>(globalSocket);
  const callbacksRef = useRef<SocketCallbacks | null>(null);
  const currentSocketIdRef = useRef<string | null>(null);
  const isInActiveCallRef = useRef<boolean>(false);
  const resyncPendingRef = useRef<boolean>(false);
  const listenersRegisteredRef = useRef<boolean>(false);

  useEffect(() => {
    socketRef.current = globalSocket;
    if (globalSocket) {
      currentSocketIdRef.current = globalSocket.id || null;
    }
  }, [globalSocket]);

  const registerSocketListeners = useCallback((socket: Socket, callbacks: SocketCallbacks) => {
    socket.on("joined-queue", (data) => {
      publishPresence('matching');
      callbacks.onJoinedQueue(data);
    });

    socket.on("matched", (data) => {
      publishPresence('in_call');
      isInActiveCallRef.current = true;
      socketHealthMonitor.markEventReceived();
      callbacks.onMatched(data);
    });

    socket.on("signal", (data) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onSignal(data);
    });

    socket.on("peer-left", (data) => {
      publishPresence('matching');
      isInActiveCallRef.current = false;
      socketHealthMonitor.markEventReceived();
      callbacks.onPeerLeft(data);
    });

    socket.on("peer-skipped", (data) => {
      publishPresence('matching');
      callbacks.onPeerSkipped(data);
    });

    socket.on("skipped", (data) => {
      publishPresence('matching');
      isInActiveCallRef.current = false;
      callbacks.onSkipped(data);
    });

    socket.on("end-call", (data) => {
      publishPresence('available');
      isInActiveCallRef.current = false;
      socketHealthMonitor.markEventReceived();
      callbacks.onEndCall(data);
    });

    socket.on("chat-message", (data) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onChatMessage(data);
    });

    socket.on("mute-toggle", (data) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onMuteToggle(data);
    });

    socket.on("video-toggle", (data) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onVideoToggle(data);
    });

    socket.on("screen-share:toggle", (data) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onScreenShareToggle(data);
    });

    socket.on("queue-timeout", (data) => {
      publishPresence('available');
      callbacks.onQueueTimeout(data);
    });

    socket.on("error", (data) => {
      console.error("Socket error:", data.message);
      publishPresence('offline');
      callbacks.onError(data);
    });

    socket.on("favorite:added", (data) => {
      callbacks.onFavoriteAdded(data);
    });

    socket.on("favorite:added:self", (data) => {
      callbacks.onFavoriteAddedSelf(data);
    });

    socket.on("favorite:removed", (data) => {
      callbacks.onFavoriteRemoved(data);
    });

    socket.on("favorite:removed:self", (data) => {
      callbacks.onFavoriteRemovedSelf(data);
    });
  }, []);

  const initializeSocket = useCallback(
    async (callbacks: SocketCallbacks): Promise<void> => {
      if (!socketRef.current) {
        console.error("Socket not available from provider");
        throw new Error("Socket not available");
      }

      if (listenersRegisteredRef.current && callbacksRef.current === callbacks) {
        return;
      }

      const socket = socketRef.current;

      if (listenersRegisteredRef.current) {
        socket.removeAllListeners("joined-queue");
        socket.removeAllListeners("matched");
        socket.removeAllListeners("signal");
        socket.removeAllListeners("peer-left");
        socket.removeAllListeners("peer-skipped");
        socket.removeAllListeners("skipped");
        socket.removeAllListeners("end-call");
        socket.removeAllListeners("chat-message");
        socket.removeAllListeners("mute-toggle");
        socket.removeAllListeners("video-toggle");
        socket.removeAllListeners("screen-share:toggle");
        socket.removeAllListeners("queue-timeout");
        socket.removeAllListeners("error");
        socket.removeAllListeners("favorite:added");
        socket.removeAllListeners("favorite:added:self");
        socket.removeAllListeners("favorite:removed");
        socket.removeAllListeners("favorite:removed:self");
        unregisterCallbacks('socket-signaling');
      }

      callbacksRef.current = callbacks;
      registerSocketListeners(socket, callbacks);
      listenersRegisteredRef.current = true;

      registerCallbacks('socket-signaling', {
        onConnect: callbacks.onConnect,
        onDisconnect: callbacks.onDisconnect,
        onBackendRestart: callbacks.onBackendRestart,
        onConnectError: callbacks.onConnectError,
      });
    },
    [registerSocketListeners, registerCallbacks, unregisterCallbacks]
  );

  const sendSignal = useCallback((data: SignalData) => {
    if (socketRef.current) {
      if (!socketHealthMonitor.isHealthy()) {
        if (socketRef.current.connected) {
          socketRef.current.emit("signal", data);
        }
      } else {
        socketRef.current.emit("signal", data);
      }
    }
  }, []);

  const joinQueue = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        socketRef.current.emit("join");
        publishPresence('matching');
      } else {
        socketRef.current.once("connect", () => {
          socketRef.current!.emit("join");
          publishPresence('matching');
        });
      }
    }
  }, []);

  const skipPeer = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("skip");
      publishPresence('matching');
    }
  }, []);

  const sendEndCall = useCallback(() => {
    if (socketRef.current) {
      isInActiveCallRef.current = false;
      const sendEndCallWithRetry = () => {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("end-call");
          publishPresence('available');
        } else if (socketRef.current) {
          socketRef.current.once("connect", () => {
            socketRef.current?.emit("end-call");
            publishPresence('available');
          });
        }
      };

      if (socketHealthMonitor.isHealthy() || socketRef.current.connected) {
        sendEndCallWithRetry();
      } else {
        sendEndCallWithRetry();
      }
    }
  }, []);

  const sendChatMessage = useCallback((message: string, timestamp: number) => {
    if (socketRef.current) {
      socketRef.current.emit("chat-message", { message, timestamp });
    }
  }, []);

  const sendMuteToggle = useCallback((muted: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("mute-toggle", { muted });
    }
  }, []);

  const sendVideoToggle = useCallback((videoOff: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("video-toggle", { videoOff });
    }
  }, []);

  const sendScreenShareToggle = useCallback((sharing: boolean, streamId?: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("screen-share:toggle", { sharing, streamId });
    }
  }, []);

  const sendReaction = useCallback((count: number, type: string = "heart") => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("reaction:triggered", { count, type, timestamp: Date.now() });
    }
  }, []);

  const sendFavoriteNotification = useCallback((action: "added" | "removed", peerUserId: string, userName: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("favorite:notify-peer", {
        action,
        peer_user_id: peerUserId,
        user_name: userName,
      });
    }
  }, []);

  const removeAllListeners = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners("joined-queue");
      socketRef.current.removeAllListeners("matched");
      socketRef.current.removeAllListeners("signal");
      socketRef.current.removeAllListeners("peer-left");
      socketRef.current.removeAllListeners("peer-skipped");
      socketRef.current.removeAllListeners("skipped");
      socketRef.current.removeAllListeners("end-call");
      socketRef.current.removeAllListeners("chat-message");
      socketRef.current.removeAllListeners("mute-toggle");
      socketRef.current.removeAllListeners("video-toggle");
      socketRef.current.removeAllListeners("screen-share:toggle");
      socketRef.current.removeAllListeners("queue-timeout");
      socketRef.current.removeAllListeners("error");
      socketRef.current.removeAllListeners("favorite:added");
      socketRef.current.removeAllListeners("favorite:added:self");
      socketRef.current.removeAllListeners("favorite:removed");
      socketRef.current.removeAllListeners("favorite:removed:self");
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    isInActiveCallRef.current = false;
    resyncPendingRef.current = false;
    listenersRegisteredRef.current = false;
    removeAllListeners();
    unregisterCallbacks('socket-signaling');
  }, [removeAllListeners, unregisterCallbacks]);

  const getSocket = useCallback((): Socket | null => {
    return socketRef.current;
  }, []);

  const getSocketId = useCallback((): string | null => {
    return currentSocketIdRef.current;
  }, []);

  const isSocketHealthy = useCallback((): boolean => {
    return socketHealthMonitor.isHealthy();
  }, []);

  const requestResync = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      resyncPendingRef.current = true;
      socketRef.current.emit("resync-session", {
        timestamp: Date.now(),
      });
    }
  }, []);

  return useMemo(
    () => ({
      initializeSocket,
      sendSignal,
      joinQueue,
      skipPeer,
      sendEndCall,
      sendChatMessage,
      sendMuteToggle,
      sendVideoToggle,
      sendScreenShareToggle,
      sendReaction,
      sendFavoriteNotification,
      removeAllListeners,
      disconnectSocket,
      getSocket,
      getSocketId,
      isSocketHealthy,
      requestResync,
      socketRef,
      currentSocketIdRef,
      isInActiveCallRef,
    }),
    [
      initializeSocket,
      sendSignal,
      joinQueue,
      skipPeer,
      sendEndCall,
      sendChatMessage,
      sendMuteToggle,
      sendVideoToggle,
      sendScreenShareToggle,
      sendReaction,
      sendFavoriteNotification,
      removeAllListeners,
      disconnectSocket,
      getSocket,
      getSocketId,
      isSocketHealthy,
      requestResync,
    ]
  );
}
