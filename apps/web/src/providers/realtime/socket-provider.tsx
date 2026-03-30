"use client";

import * as Sentry from "@sentry/nextjs";
import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Socket } from "socket.io-client";
import { createNamespaceSockets, updateToken } from "@/lib/realtime/socket";
import { socketHealthMonitor } from "@/lib/realtime/socket-health";
import { backendRestartDetector } from "@/lib/realtime/backend-restart-detector";
import { publishPresence, setPresencePublisher } from "@/lib/realtime/presence";
import { getUserTimezone } from "@/shared/utils/timezone";
import { syncUserTimezone } from "@/features/user/api/profile";

import { useUserContext } from "@/providers/user/user-provider";
import { useSocketStore } from "@/features/realtime/model/socket-store";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

type SocketEventCallback = {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onBackendRestart?: () => void;
  onConnectError?: (error: Error) => void;
  onResyncRequired?: () => void;
  onForcedTeardown?: () => void;
};

export interface SocketContextValue {
  socket: Socket | null;
  adminSocket: Socket | null;
  connectionState: ConnectionState;
  socketId: string | null;
  isHealthy: boolean;
  updateToken: (token: string) => void;
  registerCallbacks: (key: string, callbacks: SocketEventCallback) => void;
  unregisterCallbacks: (key: string) => void;
}

type SocketContextValueFromProvider = Omit<
  SocketContextValue,
  "connectionState" | "isHealthy"
>;

const SocketContext = createContext<SocketContextValueFromProvider | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { state: { getToken }, auth: { isLoaded, isSignedIn } } = useUserContext();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const adminSocketRef = useRef<Socket | null>(null);
  const [adminSocket, setAdminSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const socketIdRef = useRef<string | null>(null);
  const initializingRef = useRef(false);
  const callbacksRef = useRef<Map<string, SocketEventCallback>>(new Map());
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timezoneSyncedRef = useRef(false);

  const registerCallbacks = useCallback((key: string, callbacks: SocketEventCallback) => {
    callbacksRef.current.set(key, callbacks);
  }, []);

  const unregisterCallbacks = useCallback((key: string) => {
    callbacksRef.current.delete(key);
  }, []);

  const initializeSocket = useCallback(async (tokenOverride?: string) => {
    if (initializingRef.current) {
      return;
    }

    if (socketRef.current && (socketRef.current.connected || socketRef.current.active)) {
      return;
    }

    if (!isLoaded) {
      return;
    }

    initializingRef.current = true;

    try {
      const token = tokenOverride || await getToken();
      useSocketStore.getState().setConnectionState("connecting");
      const { chat: chatSocket, admin: adminNamespaceSocket } = await createNamespaceSockets(token);

      if (socketRef.current && socketRef.current !== chatSocket) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
      }
      if (adminSocketRef.current && adminSocketRef.current !== adminNamespaceSocket) {
        adminSocketRef.current.removeAllListeners();
        adminSocketRef.current.disconnect();
      }

      socketRef.current = chatSocket;
      setSocket(chatSocket);
      adminSocketRef.current = adminNamespaceSocket;
      setAdminSocket(adminNamespaceSocket);

      adminNamespaceSocket.on("connect", () => {
      });

      adminNamespaceSocket.on("disconnect", () => {
      });

      adminNamespaceSocket.on("connect_error", () => {
        setAdminSocket(adminNamespaceSocket);
      });

      const existingConnectListeners = chatSocket.listeners("connect").length;
      if (existingConnectListeners === 0) {
        chatSocket.on("connect", () => {
          if (!timezoneSyncedRef.current) {
            timezoneSyncedRef.current = true;
            syncUserTimezone(getUserTimezone()).catch(() => { });
          }

          const visibility = document.visibilityState === "visible" ? "foreground" : "background";
          chatSocket.emit(`client:visibility:${visibility}`);

          const isBackendRestart = backendRestartDetector.recordConnect(chatSocket);

          const newSocketId = chatSocket.id || null;
          setSocketId(newSocketId);
          socketIdRef.current = newSocketId;
          useSocketStore.getState().setConnectionState("connected");
          setPresencePublisher((state) => {
            if (chatSocket.connected) {
              chatSocket.emit("client:presence", { state });
            }
          });
          publishPresence('online');
          socketHealthMonitor.markEventReceived();

          if (isBackendRestart) {
            callbacksRef.current.forEach(cb => cb.onBackendRestart?.());
          }

          callbacksRef.current.forEach(cb => cb.onConnect?.());
        });
      }

      const existingDisconnectListeners = chatSocket.listeners("disconnect").length;
      if (existingDisconnectListeners === 0) {
        chatSocket.on("disconnect", (reason) => {
          const wasConnected = socketIdRef.current !== null;
          backendRestartDetector.recordDisconnect(reason, wasConnected);
          useSocketStore.getState().setConnectionState("disconnected");
          setPresencePublisher(null);
          publishPresence('offline');

          if (healthCheckIntervalRef.current) {
            clearInterval(healthCheckIntervalRef.current);
            healthCheckIntervalRef.current = null;
          }

          callbacksRef.current.forEach(cb => cb.onDisconnect?.(reason));
        });
      }

      const existingConnectErrorListeners = chatSocket.listeners("connect_error").length;
      if (existingConnectErrorListeners === 0) {
        chatSocket.on("connect_error", (error) => {
          Sentry.logger.error("[SocketProvider] Connection error", { error });
          useSocketStore.getState().setConnectionState("disconnected");
          setPresencePublisher(null);
          publishPresence('offline');
          callbacksRef.current.forEach(cb => cb.onConnectError?.(error));
        });
      }

      const existingReconnectAttemptListeners = chatSocket.listeners("reconnect_attempt").length;
      if (existingReconnectAttemptListeners === 0) {
        chatSocket.on("reconnect_attempt", () => {
          useSocketStore.getState().setConnectionState("reconnecting");
        });
      }


      socketHealthMonitor.stop();
      socketHealthMonitor.start({
        socket: chatSocket,
        isInActiveCall: () => {
          const status = useVideoChatStore.getState().connectionStatus;
          return status === "matched" || status === "in_call" || status === "reconnecting";
        },
        getRoomInfo: () => null,
        onHalfDeadDetected: () => {
          useSocketStore.getState().setIsHealthy(false);
        },
        onResyncRequired: () => {
          callbacksRef.current.forEach(cb => cb.onResyncRequired?.());
        },
        onForcedTeardown: () => {
          callbacksRef.current.forEach(cb => cb.onForcedTeardown?.());
        },
      });

      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      healthCheckIntervalRef.current = setInterval(() => {
        useSocketStore.getState().setIsHealthy(socketHealthMonitor.isHealthy());
      }, 1000);

      const handleVisibilityChange = () => {
        if (!chatSocket || !chatSocket.connected) {
          return;
        }
        const visibility = document.visibilityState === "visible" ? "foreground" : "background";
        chatSocket.emit(`client:visibility:${visibility}`);
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      const cleanupVisibility = () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };

      if (socketRef.current) {
        (socketRef.current as any)._visibilityCleanup = cleanupVisibility;
      }
    } finally {
      initializingRef.current = false;
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && !socketRef.current) {
        Sentry.logger.info("Initializing socket", { isSignedIn });
        initializeSocket();
      } else if (!isSignedIn && socketRef.current) {
        Sentry.logger.info("Removing all listeners and disconnecting socket", { isSignedIn });
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [isLoaded, isSignedIn]);


  useEffect(() => {
    return () => {
      socketHealthMonitor.stop();
      backendRestartDetector.reset();
      useSocketStore.getState().setConnectionState("disconnected");
      useSocketStore.getState().setIsHealthy(false);

      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      if (socketRef.current) {
        if ((socketRef.current as any)._visibilityCleanup) {
          (socketRef.current as any)._visibilityCleanup();
        }
        setPresencePublisher(null);
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
  }, []);

  const updateSocketToken = useCallback((token: string) => {
    if (!socketRef.current) {
      initializeSocket(token);
      return;
    }

    updateToken(socketRef.current, token);
    if (adminSocketRef.current) {
      updateToken(adminSocketRef.current, token);
    }
  }, [initializeSocket]);

  const value = {
    socket,
    adminSocket,
    socketId,
    updateToken: updateSocketToken,
    registerCallbacks,
    unregisterCallbacks,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export { SocketContext };
