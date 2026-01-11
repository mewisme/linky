"use client";

import { useRef, useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { publishPresence } from "@/lib/mqtt/client";
import { createSocket, updateToken, type SignalData } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import { logger } from "@/utils/logger";

export interface SocketCallbacks {
  onJoinedQueue: (data: { message: string; queueSize: number }) => void;
  onMatched: (data: { roomId: string; peerId: string; isOfferer: boolean }) => void;
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
}

export interface UseSocketSignalingReturn {
  initializeSocket: (callbacks: SocketCallbacks, token?: string) => Promise<Socket>;
  updateSocketToken: (token: string) => void;
  sendSignal: (data: SignalData) => void;
  joinQueue: () => void;
  skipPeer: () => void;
  sendEndCall: () => void;
  sendChatMessage: (message: string, timestamp: number) => void;
  sendMuteToggle: (muted: boolean) => void;
  removeAllListeners: () => void;
  disconnectSocket: () => void;
  getSocket: () => Socket | null;
  getSocketId: () => string | null;
  socketRef: MutableRefObject<Socket | null>;
  currentSocketIdRef: MutableRefObject<string | null>;
}

export function useSocketSignaling(): UseSocketSignalingReturn {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef<SocketCallbacks | null>(null);
  const currentSocketIdRef = useRef<string | null>(null);

  const registerSocketListeners = useCallback((socket: Socket, callbacks: SocketCallbacks) => {
    socket.on("connect", () => {
      logger.done("Socket connected:", socket.id);
      currentSocketIdRef.current = socket.id || null;
      publishPresence('online');
      callbacks.onConnect();
    });

    socket.on("disconnect", (reason) => {
      logger.info("Socket disconnected:", reason);
      publishPresence('offline');
      callbacks.onDisconnect(reason);
    });

    socket.on("connect_error", (error) => {
      logger.error("Socket connection error:", error);
      publishPresence('offline');
      callbacks.onConnectError(error);
    });

    socket.on("session-waiting", (data) => {
      logger.info("Session queued:", data.message, "Position:", data.positionInQueue);
      publishPresence('available');
      callbacks.onSessionWaiting(data);
    });

    socket.on("session-activated", (data) => {
      logger.info("Session activated:", data.message);
      publishPresence('available');
      callbacks.onSessionActivated(data);
    });

    socket.on("joined-queue", (data) => {
      logger.done("Joined queue:", data);
      publishPresence('available');
      callbacks.onJoinedQueue(data);
    });

    socket.on("matched", (data) => {
      logger.done("Matched with peer:", data.peerId, "Room:", data.roomId, "Is offerer:", data.isOfferer);
      publishPresence('in_call');
      callbacks.onMatched(data);
    });

    socket.on("signal", (data) => {
      publishPresence('in_call');
      callbacks.onSignal(data);
    });

    socket.on("peer-left", (data) => {
      logger.info("Peer left:", data.message);
      publishPresence('online');
      callbacks.onPeerLeft(data);
    });

    socket.on("peer-skipped", (data) => {
      logger.info("Peer skipped:", data.message, "Queue size:", data.queueSize);
      publishPresence('online');
      callbacks.onPeerSkipped(data);
    });

    socket.on("skipped", (data) => {
      logger.info("Skipped:", data.message, "Queue size:", data.queueSize);
      publishPresence('online');
      callbacks.onSkipped(data);
    });

    socket.on("end-call", (data) => {
      logger.info("End call received from peer:", data.message);
      publishPresence('online');
      callbacks.onEndCall(data);
    });

    socket.on("chat-message", (data) => {
      logger.info("Chat message received:", data.message);
      publishPresence('in_call');
      callbacks.onChatMessage(data);
    });

    socket.on("mute-toggle", (data) => {
      logger.info("Peer mute state changed:", data.muted);
      publishPresence('in_call');
      callbacks.onMuteToggle(data);
    });

    socket.on("queue-timeout", (data) => {
      logger.info("Queue timeout:", data.message);
      publishPresence('online');
      callbacks.onQueueTimeout(data);
    });

    socket.on("error", (data) => {
      logger.error("Socket error:", data.message);
      publishPresence('offline');
      callbacks.onError(data);
    });
  }, []);

  const initializeSocket = useCallback(
    async (callbacks: SocketCallbacks, token?: string): Promise<Socket> => {
      if (socketRef.current) {
        if (!socketRef.current.connected) {
          logger.warn("Existing socket not connected, cleaning up...");
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } else {
          logger.info("Reusing existing socket connection:", socketRef.current.id);
          socketRef.current.removeAllListeners();
          callbacksRef.current = callbacks;
          registerSocketListeners(socketRef.current, callbacks);
          return socketRef.current;
        }
      }

      logger.load("Creating new socket connection...");
      const socket = await createSocket(token);
      socketRef.current = socket;
      callbacksRef.current = callbacks;

      registerSocketListeners(socket, callbacks);

      return socket;
    },
    [registerSocketListeners]
  );

  const sendSignal = useCallback((data: SignalData) => {
    if (socketRef.current) {
      socketRef.current.emit("signal", data);
    }
  }, []);

  const joinQueue = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        logger.done("Socket already connected, joining queue...");
        socketRef.current.emit("join");
        publishPresence('available');
      } else {
        logger.load("Waiting for socket connection before joining queue...");
        socketRef.current.once("connect", () => {
          logger.done("Socket connected, joining queue...");
          socketRef.current!.emit("join");
          publishPresence('available');
        });
      }
    }
  }, []);

  const skipPeer = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("skip");
      publishPresence('available');
    }
  }, []);

  const sendEndCall = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("end-call");
      publishPresence('online');
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

  const removeAllListeners = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      currentSocketIdRef.current = null;
    }
  }, []);

  const getSocket = useCallback((): Socket | null => {
    return socketRef.current;
  }, []);

  const getSocketId = useCallback((): string | null => {
    return currentSocketIdRef.current;
  }, []);

  const updateSocketToken = useCallback((token: string) => {
    if (!socketRef.current) {
      logger.warn("Cannot update token: socket not initialized");
      return;
    }

    // Update token - updateToken function handles socket state internally
    updateToken(socketRef.current, token);
    logger.info("Socket token updated");
  }, []);

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  return useMemo(
    () => ({
      initializeSocket,
      updateSocketToken,
      sendSignal,
      joinQueue,
      skipPeer,
      sendEndCall,
      sendChatMessage,
      sendMuteToggle,
      removeAllListeners,
      disconnectSocket,
      getSocket,
      getSocketId,
      socketRef,
      currentSocketIdRef,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

