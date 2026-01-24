"use client";

import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Socket } from "socket.io-client";
import { createNamespaceSockets, updateToken } from "@/lib/socket/socket";
import { socketHealthMonitor } from "@/lib/socket/socket-health";
import { backendRestartDetector } from "@/lib/socket/backend-restart-detector";
import { publishPresence } from "@/lib/mqtt/client";
import { getUserTimezone } from "@/utils/timezone";

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
  adminSocket: Socket | null;
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
  const adminSocketRef = useRef<Socket | null>(null);
  const [adminSocket, setAdminSocket] = useState<Socket | null>(null);
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
      console.info("[SocketProvider] Already initializing, skipping...");
      return;
    }

    if (socketRef.current?.connected) {
      console.info("[SocketProvider] Socket already connected:", socketRef.current.id);
      return;
    }

    if (!isLoaded) {
      console.info("[SocketProvider] Auth not loaded yet, waiting...");
      return;
    }

    initializingRef.current = true;

    try {
      const token = tokenOverride || await getToken();
      console.info("[SocketProvider] Initializing global socket...");
      setConnectionState("connecting");
      const { chat: chatSocket, admin: adminNamespaceSocket } = await createNamespaceSockets(token);
      socketRef.current = chatSocket;
      setSocket(chatSocket);
      adminSocketRef.current = adminNamespaceSocket;
      setAdminSocket(adminNamespaceSocket);

      adminNamespaceSocket.on("connect", () => {
        console.info("[SocketProvider] Admin namespace connected:", adminNamespaceSocket.id);
      });

      adminNamespaceSocket.on("disconnect", () => {
        console.info("[SocketProvider] Admin namespace disconnected");
      });

      adminNamespaceSocket.on("connect_error", () => {
        setAdminSocket(adminNamespaceSocket);
      });

      chatSocket.on("connect", () => {
        console.log("[SocketProvider] Socket connected:", chatSocket.id);
        chatSocket.emit("client:timezone:init", { timezone: getUserTimezone() });

        const isBackendRestart = backendRestartDetector.recordConnect(chatSocket);

        const newSocketId = chatSocket.id || null;
        setSocketId(newSocketId);
        socketIdRef.current = newSocketId;
        setConnectionState("connected");
        publishPresence('online');
        socketHealthMonitor.markEventReceived();

        if (isBackendRestart) {
          console.warn("[SocketProvider] Backend restart detected");
          isInActiveCallRef.current = false;
          resyncPendingRef.current = false;
          callbacksRef.current.forEach(cb => cb.onBackendRestart?.());
        } else if (resyncPendingRef.current && isInActiveCallRef.current) {
          console.info("[SocketProvider] Reconnecting - requesting resync");
          resyncPendingRef.current = false;
          if (chatSocket.connected) {
            chatSocket.emit("resync-session", { timestamp: Date.now() });
          }
        }

        callbacksRef.current.forEach(cb => cb.onConnect?.());
      });

      chatSocket.on("disconnect", (reason) => {
        console.info("[SocketProvider] Socket disconnected:", reason);
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

      chatSocket.on("connect_error", (error) => {
        console.error("[SocketProvider] Connection error:", error);
        setConnectionState("disconnected");
        publishPresence('offline');
        callbacksRef.current.forEach(cb => cb.onConnectError?.(error));
      });

      chatSocket.on("reconnect_attempt", () => {
        console.info("[SocketProvider] Reconnecting...");
        setConnectionState("reconnecting");
      });

      chatSocket.on("session-waiting", (data) => {
        console.info("[SocketProvider] Session queued:", data.message, "Position:", data.positionInQueue);
        publishPresence('online');
        callbacksRef.current.forEach(cb => cb.onSessionWaiting?.(data));
      });

      chatSocket.on("session-activated", (data) => {
        console.info("[SocketProvider] Session activated:", data.message);
        publishPresence('available');
        callbacksRef.current.forEach(cb => cb.onSessionActivated?.(data));
      });

      chatSocket.on("room-ping", (data: { timestamp?: number; roomId?: string }) => {
        console.info("[SocketProvider] Room heartbeat received:", data.roomId);
        socketHealthMonitor.markEventReceived();
      });

      socketHealthMonitor.stop();
      socketHealthMonitor.start({
        socket: chatSocket,
        isInActiveCall: () => isInActiveCallRef.current,
        getRoomInfo: () => null,
        onHalfDeadDetected: () => {
          console.warn("[SocketProvider] Half-dead socket detected");
          setIsHealthy(false);
        },
        onResyncRequired: () => {
          console.info("[SocketProvider] Resync required");
          resyncPendingRef.current = true;
          if (chatSocket.connected) {
            chatSocket.emit("resync-session", { timestamp: Date.now() });
          }
        },
        onForcedTeardown: () => {
          console.error("[SocketProvider] Forced teardown");
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
      console.info("[SocketProvider] Cleaning up socket...");
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

      if (adminSocketRef.current) {
        adminSocketRef.current.removeAllListeners();
        adminSocketRef.current.disconnect();
        adminSocketRef.current = null;
        setAdminSocket(null);
      }
    };
  }, [initializeSocket, isLoaded]);

  const updateSocketToken = useCallback((token: string) => {
    if (!socketRef.current) {
      console.warn("[SocketProvider] Cannot update token: socket not initialized");
      initializeSocket(token);
      return;
    }

    updateToken(socketRef.current, token);
    if (adminSocketRef.current) {
      updateToken(adminSocketRef.current, token);
    }
    console.info("[SocketProvider] Token updated");
  }, [initializeSocket]);

  const requestResync = useCallback(() => {
    if (socketRef.current?.connected) {
      console.info("[SocketProvider] Explicit resync requested");
      resyncPendingRef.current = true;
      socketRef.current.emit("resync-session", { timestamp: Date.now() });
    }
  }, []);

  const value: SocketContextValue = {
    socket,
    adminSocket,
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
