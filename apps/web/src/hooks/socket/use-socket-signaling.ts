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
  onQueueTimeout: (data: { message: string }) => void;
  onError: (data: { message: string }) => void;
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onConnectError: (error: Error) => void;
  onSessionWaiting: (data: { message: string; positionInQueue: number; queueSize: number }) => void;
  onSessionActivated: (data: { message: string }) => void;
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

  useEffect(() => {
    socketRef.current = globalSocket;
    if (globalSocket) {
      currentSocketIdRef.current = globalSocket.id || null;
    }
  }, [globalSocket]);

  const registerSocketListeners = useCallback((socket: Socket, callbacks: SocketCallbacks) => {
    socket.on("joined-queue", (data) => {
      console.log("Joined queue:", data);
      publishPresence('matching');
      callbacks.onJoinedQueue(data);
    });

    socket.on("matched", (data) => {
      console.log("Matched with peer:", data.peerId, "Room:", data.roomId, "Is offerer:", data.isOfferer);
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
      console.info("Peer left:", data.message);
      publishPresence('matching');
      isInActiveCallRef.current = false;
      socketHealthMonitor.markEventReceived();
      callbacks.onPeerLeft(data);
    });

    socket.on("peer-skipped", (data) => {
      console.info("Peer skipped:", data.message, "Queue size:", data.queueSize);
      publishPresence('matching');
      callbacks.onPeerSkipped(data);
    });

    socket.on("skipped", (data) => {
      console.info("Skipped:", data.message, "Queue size:", data.queueSize);
      publishPresence('matching');
      callbacks.onSkipped(data);
    });

    socket.on("end-call", (data) => {
      console.info("End call received from peer:", data.message);
      publishPresence('available');
      isInActiveCallRef.current = false;
      socketHealthMonitor.markEventReceived();
      callbacks.onEndCall(data);
    });

    socket.on("chat-message", (data) => {
      console.info("Chat message received:", data.message);
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onChatMessage(data);
    });

    socket.on("mute-toggle", (data) => {
      console.info("Peer mute state changed:", data.muted);
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onMuteToggle(data);
    });

    socket.on("queue-timeout", (data) => {
      console.info("Queue timeout:", data.message);
      publishPresence('available');
      callbacks.onQueueTimeout(data);
    });

    socket.on("error", (data) => {
      console.error("Socket error:", data.message);
      publishPresence('offline');
      callbacks.onError(data);
    });

    socket.on("favorite:added", (data) => {
      console.info("Added to favorites by:", data.from_user_name);
      callbacks.onFavoriteAdded(data);
    });

    socket.on("favorite:added:self", (data) => {
      console.info("Favorite added successfully:", data.favorite_user_id);
      callbacks.onFavoriteAddedSelf(data);
    });

    socket.on("favorite:removed", (data) => {
      console.info("Removed from favorites by:", data.from_user_name);
      callbacks.onFavoriteRemoved(data);
    });

    socket.on("favorite:removed:self", (data) => {
      console.info("Favorite removed successfully:", data.favorite_user_id);
      callbacks.onFavoriteRemovedSelf(data);
    });
  }, []);

  const initializeSocket = useCallback(
    async (callbacks: SocketCallbacks): Promise<void> => {
      if (!socketRef.current) {
        console.error("Socket not available from provider");
        throw new Error("Socket not available");
      }

      const socket = socketRef.current;

      console.info("Initializing socket signaling listeners...");
      socket.removeAllListeners("joined-queue");
      socket.removeAllListeners("matched");
      socket.removeAllListeners("signal");
      socket.removeAllListeners("peer-left");
      socket.removeAllListeners("peer-skipped");
      socket.removeAllListeners("skipped");
      socket.removeAllListeners("end-call");
      socket.removeAllListeners("chat-message");
      socket.removeAllListeners("mute-toggle");
      socket.removeAllListeners("queue-timeout");
      socket.removeAllListeners("error");
      socket.removeAllListeners("favorite:added");
      socket.removeAllListeners("favorite:added:self");
      socket.removeAllListeners("favorite:removed");
      socket.removeAllListeners("favorite:removed:self");

      callbacksRef.current = callbacks;
      registerSocketListeners(socket, callbacks);

      registerCallbacks('socket-signaling', {
        onConnect: callbacks.onConnect,
        onDisconnect: callbacks.onDisconnect,
        onBackendRestart: callbacks.onBackendRestart,
        onConnectError: callbacks.onConnectError,
        onSessionWaiting: callbacks.onSessionWaiting,
        onSessionActivated: callbacks.onSessionActivated,
      });
    },
    [registerSocketListeners, registerCallbacks]
  );

  const sendSignal = useCallback((data: SignalData) => {
    if (socketRef.current) {
      if (!socketHealthMonitor.isHealthy()) {
        console.warn("[SocketHealth] Socket unhealthy, deferring signal send");
        if (socketRef.current.connected) {
          socketRef.current.emit("signal", data);
        } else {
          console.error("[SocketHealth] Cannot send signal - socket disconnected");
        }
      } else {
        socketRef.current.emit("signal", data);
      }
    }
  }, []);

  const joinQueue = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        console.log("Socket already connected, joining queue...");
        socketRef.current.emit("join");
        publishPresence('matching');
      } else {
        console.log("Waiting for socket connection before joining queue...");
        socketRef.current.once("connect", () => {
          console.log("Socket connected, joining queue...");
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
        console.warn("[SocketHealth] Socket unhealthy, queuing end-call for retry");
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
      console.info("Favorite notification sent to server:", action, "for peer:", peerUserId);
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
      console.info("[SocketResync] Explicit resync requested");
      resyncPendingRef.current = true;
      socketRef.current.emit("resync-session", {
        timestamp: Date.now(),
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  return useMemo(
    () => ({
      initializeSocket,
      sendSignal,
      joinQueue,
      skipPeer,
      sendEndCall,
      sendChatMessage,
      sendMuteToggle,
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
