"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import { createSocket, type SignalData } from "@/lib/socket";
import type { Socket } from "socket.io-client";

export interface SocketCallbacks {
  onJoinedQueue: (data: { message: string; queueSize: number }) => void;
  onMatched: (data: { roomId: string; peerId: string; isOfferer: boolean }) => void;
  onSignal: (data: SignalData) => void;
  onPeerLeft: (data: { message: string }) => void;
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

/**
 * Hook for managing Socket.IO signaling connection
 * Handles socket lifecycle, event registration, and message sending
 */
export function useSocketSignaling() {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef<SocketCallbacks | null>(null);
  const currentSocketIdRef = useRef<string | null>(null);

  /**
   * Register all socket event listeners
   */
  const registerSocketListeners = useCallback((socket: Socket, callbacks: SocketCallbacks) => {
    // Connection events
    socket.on("connect", () => {
      console.log("[SUCCESS] Socket connected:", socket.id);
      currentSocketIdRef.current = socket.id || null;
      callbacks.onConnect();
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      callbacks.onDisconnect(reason);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      callbacks.onConnectError(error);
    });

    // Session management events
    socket.on("session-waiting", (data) => {
      console.log("[SESSION] Session queued:", data.message, "Position:", data.positionInQueue);
      callbacks.onSessionWaiting(data);
    });

    socket.on("session-activated", (data) => {
      console.log("[SESSION] Session activated:", data.message);
      callbacks.onSessionActivated(data);
    });

    // Matchmaking events
    socket.on("joined-queue", (data) => {
      console.log("[SUCCESS] Joined queue:", data);
      callbacks.onJoinedQueue(data);
    });

    socket.on("matched", (data) => {
      console.log("[SUCCESS] Matched with peer:", data.peerId, "Room:", data.roomId, "Is offerer:", data.isOfferer);
      callbacks.onMatched(data);
    });

    // Signaling events
    socket.on("signal", (data) => {
      callbacks.onSignal(data);
    });

    // Peer management events
    socket.on("peer-left", (data) => {
      console.log("Peer left:", data.message);
      callbacks.onPeerLeft(data);
    });

    socket.on("peer-skipped", (data) => {
      console.log("Peer skipped:", data.message, "Queue size:", data.queueSize);
      callbacks.onPeerSkipped(data);
    });

    socket.on("skipped", (data) => {
      console.log("Skipped:", data.message, "Queue size:", data.queueSize);
      callbacks.onSkipped(data);
    });

    socket.on("end-call", (data) => {
      console.log("End call received from peer:", data.message);
      callbacks.onEndCall(data);
    });

    // Chat events
    socket.on("chat-message", (data) => {
      console.log("[CHAT] Chat message received:", data.message);
      callbacks.onChatMessage(data);
    });

    socket.on("mute-toggle", (data) => {
      console.log("[MUTE] Peer mute state changed:", data.muted);
      callbacks.onMuteToggle(data);
    });

    // Error events
    socket.on("queue-timeout", (data) => {
      console.log("Queue timeout:", data.message);
      callbacks.onQueueTimeout(data);
    });

    socket.on("error", (data) => {
      console.error("Socket error:", data.message);
      callbacks.onError(data);
    });
  }, []);

  /**
   * Initialize socket connection with authentication token
   */
  const initializeSocket = useCallback(
    (token: string, callbacks: SocketCallbacks): Socket => {
      // Clean up existing socket if it's not connected
      if (socketRef.current) {
        if (!socketRef.current.connected) {
          console.log("[WARNING] Existing socket not connected, cleaning up...");
          socketRef.current.removeAllListeners();
          socketRef.current.disconnect();
        } else {
          console.log("[REUSE] Reusing existing socket connection:", socketRef.current.id);
          // Remove old listeners to prevent duplicates
          socketRef.current.removeAllListeners();
          callbacksRef.current = callbacks;
          registerSocketListeners(socketRef.current, callbacks);
          return socketRef.current;
        }
      }

      // Create new socket connection
      console.log("[CONNECTING] Creating new socket connection...");
      const socket = createSocket(token);
      socketRef.current = socket;
      callbacksRef.current = callbacks;

      // Register all event listeners
      registerSocketListeners(socket, callbacks);

      return socket;
    },
    [registerSocketListeners]
  );

  /**
   * Send signal data to peer
   */
  const sendSignal = useCallback((data: SignalData) => {
    if (socketRef.current) {
      socketRef.current.emit("signal", data);
    }
  }, []);

  /**
   * Join matchmaking queue
   */
  const joinQueue = useCallback(() => {
    if (socketRef.current) {
      if (socketRef.current.connected) {
        console.log("[SUCCESS] Socket already connected, joining queue...");
        socketRef.current.emit("join");
      } else {
        console.log("[WAITING] Waiting for socket connection before joining queue...");
        socketRef.current.once("connect", () => {
          console.log("[SUCCESS] Socket connected, joining queue...");
          socketRef.current!.emit("join");
        });
      }
    }
  }, []);

  /**
   * Skip current peer and find new match
   */
  const skipPeer = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("skip");
    }
  }, []);

  /**
   * Send end call signal to peer
   */
  const sendEndCall = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("end-call");
    }
  }, []);

  /**
   * Send chat message to peer
   */
  const sendChatMessage = useCallback((message: string, timestamp: number) => {
    if (socketRef.current) {
      socketRef.current.emit("chat-message", { message, timestamp });
    }
  }, []);

  /**
   * Send mute state to peer
   */
  const sendMuteToggle = useCallback((muted: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("mute-toggle", { muted });
    }
  }, []);

  /**
   * Remove all socket listeners (for cleanup before reconnect)
   */
  const removeAllListeners = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
    }
  }, []);

  /**
   * Disconnect socket completely
   */
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      currentSocketIdRef.current = null;
    }
  }, []);

  /**
   * Get current socket instance
   */
  const getSocket = useCallback((): Socket | null => {
    return socketRef.current;
  }, []);

  /**
   * Get current socket ID
   */
  const getSocketId = useCallback((): string | null => {
    return currentSocketIdRef.current;
  }, []);

  // Cleanup on unmount
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
      removeAllListeners,
      disconnectSocket,
      getSocket,
      getSocketId,
      socketRef,
      currentSocketIdRef,
    }),
    // Empty deps - functions are stable because they use refs internally
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}

