"use client";

import { useRef, useCallback, useEffect, useMemo, type MutableRefObject } from "react";
import { publishPresence } from "@/lib/mqtt/client";
import { createSocket, updateToken, type SignalData } from "@/lib/socket";
import { socketHealthMonitor } from "@/lib/socket-health";
import type { Socket } from "socket.io-client";
import type { UsersAPI } from "@/types/users.types";
import { logger } from "@/utils/logger";

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
  isSocketHealthy: () => boolean;
  requestResync: () => void;
  socketRef: MutableRefObject<Socket | null>;
  currentSocketIdRef: MutableRefObject<string | null>;
}

export function useSocketSignaling(): UseSocketSignalingReturn {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef<SocketCallbacks | null>(null);
  const currentSocketIdRef = useRef<string | null>(null);
  const isInActiveCallRef = useRef<boolean>(false);
  const resyncPendingRef = useRef<boolean>(false);

  const registerSocketListeners = useCallback((socket: Socket, callbacks: SocketCallbacks) => {
    socket.on("connect", () => {
      logger.done("Socket connected:", socket.id);
      currentSocketIdRef.current = socket.id || null;
      publishPresence('online');

      // Socket health: Track connect event
      socketHealthMonitor.markEventReceived();

      // Socket resync: If resync was pending, trigger it now
      if (resyncPendingRef.current && isInActiveCallRef.current) {
        logger.info("[SocketResync] Reconnecting socket - requesting resync");
        resyncPendingRef.current = false;
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit("resync-session", {
            timestamp: Date.now(),
          });
        }
      }

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
      publishPresence('online');
      callbacks.onSessionWaiting(data);
    });

    socket.on("session-activated", (data) => {
      logger.info("Session activated:", data.message);
      publishPresence('available');
      callbacks.onSessionActivated(data);
    });

    socket.on("joined-queue", (data) => {
      logger.done("Joined queue:", data);
      publishPresence('matching');
      callbacks.onJoinedQueue(data);
    });

    socket.on("matched", (data) => {
      logger.done("Matched with peer:", data.peerId, "Room:", data.roomId, "Is offerer:", data.isOfferer);
      publishPresence('in_call');
      isInActiveCallRef.current = true;
      // Socket health: Track matched event
      socketHealthMonitor.markEventReceived();
      callbacks.onMatched(data);
    });

    socket.on("signal", (data) => {
      publishPresence('in_call');
      // Socket health: Track signal events
      socketHealthMonitor.markEventReceived();
      callbacks.onSignal(data);
    });

    socket.on("peer-left", (data) => {
      logger.info("Peer left:", data.message);
      publishPresence('matching');
      isInActiveCallRef.current = false;
      // Socket health: Track peer-left event
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
      // Socket health: Track end-call event
      socketHealthMonitor.markEventReceived();
      callbacks.onEndCall(data);
    });

    socket.on("chat-message", (data) => {
      logger.info("Chat message received:", data.message);
      publishPresence('in_call');
      // Socket health: Track chat-message event
      socketHealthMonitor.markEventReceived();
      callbacks.onChatMessage(data);
    });

    socket.on("mute-toggle", (data) => {
      logger.info("Peer mute state changed:", data.muted);
      publishPresence('in_call');
      // Socket health: Track mute-toggle event
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

    socket.on("room-ping", (data: { timestamp?: number; roomId?: string }) => {
      logger.info("[SocketHealth] Room heartbeat received:", data.roomId);
      socketHealthMonitor.markEventReceived();
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

      // Socket health: Start monitoring after socket is ready
      socketHealthMonitor.start({
        socket,
        isInActiveCall: () => isInActiveCallRef.current,
        getRoomInfo: () => {
          return null;
        },
        onHalfDeadDetected: () => {
          logger.warn("[SocketHealth] Half-dead socket detected - attempting resync");
        },
        onResyncRequired: () => {
          logger.info("[SocketResync] Resync required - emitting explicit resync event");
          resyncPendingRef.current = true;
          if (socket.connected) {
            socket.emit("resync-session", {
              timestamp: Date.now(),
            });
          }
        },
        onForcedTeardown: () => {
          logger.error("[SocketHealth] Forced teardown due to unrecoverable socket state");
          isInActiveCallRef.current = false;
          callbacks.onPeerLeft({ message: "Connection lost. Please try again." });
        },
      });

      return socket;
    },
    [registerSocketListeners]
  );

  const sendSignal = useCallback((data: SignalData) => {
    if (socketRef.current) {
      // Socket health: Ensure socket is healthy before sending critical signals
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
      // Socket health: Retry end-call if socket was unhealthy
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

  const removeAllListeners = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    socketHealthMonitor.stop();
    isInActiveCallRef.current = false;
    resyncPendingRef.current = false;
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
      isSocketHealthy,
      requestResync,
      socketRef,
      currentSocketIdRef,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isSocketHealthy, requestResync]
  );
}

