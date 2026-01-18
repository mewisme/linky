"use client";

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Socket } from "socket.io-client";
import { createSocket, updateToken } from "@/lib/socket/socket";
import { socketHealthMonitor } from "@/lib/socket/socket-health";
import { backendRestartDetector } from "@/lib/socket/backend-restart-detector";
import { publishPresence } from "@/lib/mqtt/client";
import { logger } from "@/utils/logger";
import { useUserContext } from "@/components/providers/user/user-provider";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

type SocketEventCallback = {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onBackendRestart?: () => void;
  onConnectError?: (error: Error) => void;
  onSessionWaiting?: (data: { message: string; positionInQueue: number; queueSize: number }) => void;
  onSessionActivated?: (data: { message: string }) => void;
};

export interface SocketContextValue {
  socket: Socket | null;
  connectionState: ConnectionState;
  socketId: string | null;
  isHealthy: boolean;
  updateToken: (token: string) => void;
  requestResync: () => void;
  registerCallbacks: (key: string, callbacks: SocketEventCallback) => void;
  unregisterCallbacks: (key: string) => void;
  setInActiveCall: (active: boolean) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { state: { getToken }, auth: { isLoaded } } = useUserContext();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [socketId, setSocketId] = useState<string | null>(null);
  const socketIdRef = useRef<string | null>(null);
  const [isHealthy, setIsHealthy] = useState(false);
  const isInActiveCallRef = useRef(false);
  const resyncPendingRef = useRef(false);
  const initializingRef = useRef(false);
  const callbacksRef = useRef<Map<string, SocketEventCallback>>(new Map());
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const registerCallbacks = useCallback((key: string, callbacks: SocketEventCallback) => {
    callbacksRef.current.set(key, callbacks);
  }, []);

  const unregisterCallbacks = useCallback((key: string) => {
    callbacksRef.current.delete(key);
  }, []);

  const setInActiveCall = useCallback((active: boolean) => {
    isInActiveCallRef.current = active;
  }, []);

  const initializeSocket = useCallback(async (tokenOverride?: string) => {
    if (initializingRef.current) {
      logger.info("[SocketProvider] Already initializing, skipping...");
      return;
    }

    if (socketRef.current?.connected) {
      logger.info("[SocketProvider] Socket already connected:", socketRef.current.id);
      return;
    }

    if (!isLoaded) {
      logger.info("[SocketProvider] Auth not loaded yet, waiting...");
      return;
    }

    initializingRef.current = true;

    try {
      const token = tokenOverride || await getToken();
      logger.info("[SocketProvider] Initializing global socket...");
      setConnectionState("connecting");
      const newSocket = await createSocket(token);
      socketRef.current = newSocket;
      setSocket(newSocket);

      newSocket.on("connect", () => {
        logger.done("[SocketProvider] Socket connected:", newSocket.id);
        const isBackendRestart = backendRestartDetector.recordConnect(newSocket);

        const newSocketId = newSocket.id || null;
        setSocketId(newSocketId);
        socketIdRef.current = newSocketId;
        setConnectionState("connected");
        publishPresence('online');
        socketHealthMonitor.markEventReceived();

        if (isBackendRestart) {
          logger.warn("[SocketProvider] Backend restart detected");
          isInActiveCallRef.current = false;
          resyncPendingRef.current = false;
          callbacksRef.current.forEach(cb => cb.onBackendRestart?.());
        } else if (resyncPendingRef.current && isInActiveCallRef.current) {
          logger.info("[SocketProvider] Reconnecting - requesting resync");
          resyncPendingRef.current = false;
          if (newSocket.connected) {
            newSocket.emit("resync-session", { timestamp: Date.now() });
          }
        }

        callbacksRef.current.forEach(cb => cb.onConnect?.());
      });

      newSocket.on("disconnect", (reason) => {
        logger.info("[SocketProvider] Socket disconnected:", reason);
        const wasConnected = socketIdRef.current !== null;
        backendRestartDetector.recordDisconnect(reason, wasConnected);
        setConnectionState("disconnected");
        publishPresence('offline');

        if (healthCheckIntervalRef.current) {
          clearInterval(healthCheckIntervalRef.current);
          healthCheckIntervalRef.current = null;
        }

        callbacksRef.current.forEach(cb => cb.onDisconnect?.(reason));
      });

      newSocket.on("connect_error", (error) => {
        logger.error("[SocketProvider] Connection error:", error);
        setConnectionState("disconnected");
        publishPresence('offline');
        callbacksRef.current.forEach(cb => cb.onConnectError?.(error));
      });

      newSocket.on("reconnect_attempt", () => {
        logger.info("[SocketProvider] Reconnecting...");
        setConnectionState("reconnecting");
      });

      newSocket.on("session-waiting", (data) => {
        logger.info("[SocketProvider] Session queued:", data.message, "Position:", data.positionInQueue);
        publishPresence('online');
        callbacksRef.current.forEach(cb => cb.onSessionWaiting?.(data));
      });

      newSocket.on("session-activated", (data) => {
        logger.info("[SocketProvider] Session activated:", data.message);
        publishPresence('available');
        callbacksRef.current.forEach(cb => cb.onSessionActivated?.(data));
      });

      newSocket.on("room-ping", (data: { timestamp?: number; roomId?: string }) => {
        logger.info("[SocketProvider] Room heartbeat received:", data.roomId);
        socketHealthMonitor.markEventReceived();
      });

      socketHealthMonitor.stop();
      socketHealthMonitor.start({
        socket: newSocket,
        isInActiveCall: () => isInActiveCallRef.current,
        getRoomInfo: () => null,
        onHalfDeadDetected: () => {
          logger.warn("[SocketProvider] Half-dead socket detected");
          setIsHealthy(false);
        },
        onResyncRequired: () => {
          logger.info("[SocketProvider] Resync required");
          resyncPendingRef.current = true;
          if (newSocket.connected) {
            newSocket.emit("resync-session", { timestamp: Date.now() });
          }
        },
        onForcedTeardown: () => {
          logger.error("[SocketProvider] Forced teardown");
          isInActiveCallRef.current = false;
        },
      });

      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      healthCheckIntervalRef.current = setInterval(() => {
        setIsHealthy(socketHealthMonitor.isHealthy());
      }, 1000);
    } finally {
      initializingRef.current = false;
    }
  }, [isLoaded, getToken]);

  useEffect(() => {
    if (isLoaded) {
      initializeSocket();
    }

    return () => {
      logger.info("[SocketProvider] Cleaning up socket...");
      socketHealthMonitor.stop();
      isInActiveCallRef.current = false;
      resyncPendingRef.current = false;
      backendRestartDetector.reset();

      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [initializeSocket, isLoaded]);

  const updateSocketToken = useCallback((token: string) => {
    if (!socketRef.current) {
      logger.warn("[SocketProvider] Cannot update token: socket not initialized");
      initializeSocket(token);
      return;
    }

    updateToken(socketRef.current, token);
    logger.info("[SocketProvider] Token updated");
  }, [initializeSocket]);

  const requestResync = useCallback(() => {
    if (socketRef.current?.connected) {
      logger.info("[SocketProvider] Explicit resync requested");
      resyncPendingRef.current = true;
      socketRef.current.emit("resync-session", { timestamp: Date.now() });
    }
  }, []);

  const value: SocketContextValue = {
    socket,
    connectionState,
    socketId,
    isHealthy,
    updateToken: updateSocketToken,
    requestResync,
    registerCallbacks,
    unregisterCallbacks,
    setInActiveCall,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export { SocketContext };
