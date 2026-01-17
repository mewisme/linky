"use client";

import { useRef, useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { publishPresence } from "@/lib/mqtt/client";
import { type SignalData } from "@/lib/socket/socket";
import { socketHealthMonitor } from "@/lib/socket/socket-health";
import type { Socket } from "socket.io-client";
import type { UsersAPI } from "@/types/users.types";
import { logger } from "@/utils/logger";
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
}

export interface UseSocketSignalingReturn {
  initializeSocket: (callbacks: SocketCallbacks) => Promise<void>;
  sendSignal: (data: SignalData) => void;
  joinQueue: () => void;
  skipPeer: () => void;
  sendEndCall: () => void;
  sendChatMessage: (message: string, timestamp: number) => void;
  sendMuteToggle: (muted: boolean) => void;
  sendHeartReaction: (count: number) => void;
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
      logger.done("Joined queue:", data);
      publishPresence('matching');
      callbacks.onJoinedQueue(data);
    });

    socket.on("matched", (data) => {
      logger.done("Matched with peer:", data.peerId, "Room:", data.roomId, "Is offerer:", data.isOfferer);
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
      logger.info("Peer left:", data.message);
      publishPresence('matching');
      isInActiveCallRef.current = false;
      socketHealthMonitor.markEventReceived();
      callbacks.onPeerLeft(data);
    });

    socket.on("peer-skipped", (data) => {
      logger.info("Peer skipped:", data.message, "Queue size:", data.queueSize);
      publishPresence('matching');
      callbacks.onPeerSkipped(data);
    });

    socket.on("skipped", (data) => {
      logger.info("Skipped:", data.message, "Queue size:", data.queueSize);
      publishPresence('matching');
      callbacks.onSkipped(data);
    });

    socket.on("end-call", (data) => {
      logger.info("End call received from peer:", data.message);
      publishPresence('available');
      isInActiveCallRef.current = false;
      socketHealthMonitor.markEventReceived();
      callbacks.onEndCall(data);
    });

    socket.on("chat-message", (data) => {
      logger.info("Chat message received:", data.message);
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onChatMessage(data);
    });

    socket.on("mute-toggle", (data) => {
      logger.info("Peer mute state changed:", data.muted);
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onMuteToggle(data);
    });

    socket.on("queue-timeout", (data) => {
      logger.info("Queue timeout:", data.message);
      publishPresence('available');
      callbacks.onQueueTimeout(data);
    });

    socket.on("error", (data) => {
      logger.error("Socket error:", data.message);
      publishPresence('offline');
      callbacks.onError(data);
    });
  }, []);

  const initializeSocket = useCallback(
    async (callbacks: SocketCallbacks): Promise<void> => {
      if (!socketRef.current) {
        logger.error("Socket not available from provider");
        throw new Error("Socket not available");
      }

      const socket = socketRef.current;

      logger.info("Initializing socket signaling listeners...");
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

      callbacksRef.current = callbacks;
      registerSocketListeners(socket, callbacks);

      registerCallbacks({
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
        logger.warn("[SocketHealth] Socket unhealthy, deferring signal send");
        if (socketRef.current.connected) {
          socketRef.current.emit("signal", data);
        } else {
          logger.error("[SocketHealth] Cannot send signal - socket disconnected");
        }
      } else {
        socketRef.current.emit("signal", data);
      }
    }
  }, []);

  const joinQueue = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        logger.done("Socket already connected, joining queue...");
        socketRef.current.emit("join");
        publishPresence('matching');
      } else {
        logger.load("Waiting for socket connection before joining queue...");
        socketRef.current.once("connect", () => {
          logger.done("Socket connected, joining queue...");
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
        logger.warn("[SocketHealth] Socket unhealthy, queuing end-call for retry");
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

  const sendHeartReaction = useCallback((count: number) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("reaction:heart", { count, timestamp: Date.now() });
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
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    isInActiveCallRef.current = false;
    resyncPendingRef.current = false;
    removeAllListeners();
    unregisterCallbacks();
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
      logger.info("[SocketResync] Explicit resync requested");
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
      sendHeartReaction,
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
      sendHeartReaction,
      removeAllListeners,
      disconnectSocket,
      getSocket,
      getSocketId,
      isSocketHealthy,
      requestResync,
    ]
  );
}
