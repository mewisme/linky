"use client";

import * as Sentry from "@sentry/nextjs";
import { useRef, useCallback, useEffect, useMemo, type RefObject } from "react";
import { publishPresence } from "@/lib/realtime/presence";
import { type SignalData } from "@/lib/realtime/socket";
import type { ChatErrorPayload, ChatMessagePayload, ChatTypingPayload, ChatMessageInputPayload, ChatSendAck } from "@/features/chat/types/chat-message.types";
import { socketHealthMonitor } from "@/lib/realtime/socket-health";
import type { Socket } from "socket.io-client";
import type { UsersAPI } from "@/entities/user/types/users.types";

import { useSocket } from "./use-socket";

export interface SocketCallbacks {
  onJoinedQueue: (data: { message: string; queueSize: number }) => void;
  onMatched: (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => void;
  onSignal: (data: SignalData) => void;
  onPeerLeft: (data: { message: string; queueSize?: number }) => void;
  onPeerSkipped: (data: { message: string; queueSize: number }) => void;
  onSkipped: (data: { message: string; queueSize: number }) => void;
  onEndCall: (data: { message: string }) => void;
  onChatMessage: (data: ChatMessagePayload) => void;
  onChatTyping: (data: ChatTypingPayload) => void;
  onChatError: (data: ChatErrorPayload) => void;
  onMuteToggle: (data: { muted: boolean }) => void;
  onVideoToggle: (data: { videoOff: boolean }) => void;
  onScreenShareToggle: (data: { sharing: boolean; streamId?: string }) => void;
  onQueueTimeout: (data: { message: string }) => void;
  onDequeued: (data: { reason: string }) => void;
  onError: (data: { message: string }) => void;
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onConnectError: (error: Error) => void;
  onBackendRestart: () => void;
  onResyncRequired: () => void;
  onForcedTeardown: () => void;
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
  sendChatMessage: (payload: ChatMessageInputPayload) => Promise<ChatSendAck>;
  sendChatAttachment: (payload: ChatMessageInputPayload) => Promise<ChatSendAck>;
  sendChatTyping: (isTyping: boolean) => void;
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
  socketRef: RefObject<Socket | null>;
  currentSocketIdRef: RefObject<string | null>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerMap = Map<string, (...args: any[]) => void>;

export function useSocketSignaling(): UseSocketSignalingReturn {
  const { socket: globalSocket, registerCallbacks, unregisterCallbacks } = useSocket();
  const socketRef = useRef<Socket | null>(globalSocket);
  const callbacksRef = useRef<SocketCallbacks | null>(null);
  const currentSocketIdRef = useRef<string | null>(null);
  const listenersRegisteredRef = useRef<boolean>(false);
  const handlersRef = useRef<HandlerMap>(new Map());

  useEffect(() => {
    socketRef.current = globalSocket;
    if (globalSocket) {
      currentSocketIdRef.current = globalSocket.id || null;
    }
  }, [globalSocket]);

  const unregisterSocketListeners = useCallback((socket: Socket) => {
    for (const [event, handler] of handlersRef.current) {
      socket.off(event, handler);
    }
    handlersRef.current.clear();
  }, []);

  const registerSocketListeners = useCallback((socket: Socket, callbacks: SocketCallbacks) => {
    const handlers: HandlerMap = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const register = (event: string, handler: (...args: any[]) => void) => {
      handlers.set(event, handler);
      socket.on(event, handler);
    };

    register("joined-queue", (data: { message: string; queueSize: number }) => {
      publishPresence('matching');
      callbacks.onJoinedQueue(data);
    });

    register("matched", (data: { roomId: string; peerId: string; isOfferer: boolean; peerInfo: UsersAPI.PublicUserInfo | null; myInfo: UsersAPI.PublicUserInfo | null }) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onMatched(data);
    });

    register("signal", (data: SignalData) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onSignal(data);
    });

    register("peer-left", (data: { message: string }) => {
      publishPresence('matching');
      socketHealthMonitor.markEventReceived();
      callbacks.onPeerLeft(data);
    });

    register("peer-skipped", (data: { message: string; queueSize: number }) => {
      publishPresence('matching');
      callbacks.onPeerSkipped(data);
    });

    register("skipped", (data: { message: string; queueSize: number }) => {
      publishPresence('matching');
      callbacks.onSkipped(data);
    });

    register("end-call", (data: { message: string }) => {
      publishPresence('available');
      socketHealthMonitor.markEventReceived();
      callbacks.onEndCall(data);
    });

    register("chat:message", (data: ChatMessagePayload) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onChatMessage(data);
    });

    register("chat:typing", (data: ChatTypingPayload) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onChatTyping(data);
    });

    register("chat:error", (data: ChatErrorPayload) => {
      callbacks.onChatError(data);
    });

    register("mute-toggle", (data: { muted: boolean }) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onMuteToggle(data);
    });

    register("video-toggle", (data: { videoOff: boolean }) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onVideoToggle(data);
    });

    register("screen-share:toggle", (data: { sharing: boolean; streamId?: string }) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onScreenShareToggle(data);
    });

    register("queue-timeout", (data: { message: string }) => {
      publishPresence('available');
      callbacks.onQueueTimeout(data);
    });

    register("dequeued", (data: { reason: string }) => {
      publishPresence('available');
      callbacks.onDequeued(data);
    });

    register("video-chat:error", (data: { message: string }) => {
      Sentry.logger.error("Video chat error", { message: data.message });
      callbacks.onError(data);
    });

    register("favorite:added", (data: { from_user_id: string; from_user_name: string }) => {
      callbacks.onFavoriteAdded(data);
    });

    register("favorite:added:self", (data: { favorite_user_id: string }) => {
      callbacks.onFavoriteAddedSelf(data);
    });

    register("favorite:removed", (data: { from_user_id: string; from_user_name: string }) => {
      callbacks.onFavoriteRemoved(data);
    });

    register("favorite:removed:self", (data: { favorite_user_id: string }) => {
      callbacks.onFavoriteRemovedSelf(data);
    });

    handlersRef.current = handlers;
  }, []);

  const initializeSocket = useCallback(
    async (callbacks: SocketCallbacks): Promise<void> => {
      if (!socketRef.current) {
        Sentry.logger.error("Socket not available from provider");
        throw new Error("Socket not available");
      }

      if (listenersRegisteredRef.current && callbacksRef.current === callbacks) {
        return;
      }

      const socket = socketRef.current;

      if (listenersRegisteredRef.current) {
        unregisterSocketListeners(socket);
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
        onResyncRequired: callbacks.onResyncRequired,
        onForcedTeardown: callbacks.onForcedTeardown,
      });
    },
    [registerSocketListeners, unregisterSocketListeners, registerCallbacks, unregisterCallbacks]
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

  const emitWithAck = useCallback(
    (eventName: "chat:send" | "chat:attachment:send", payload: ChatMessageInputPayload): Promise<ChatSendAck> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ ok: false, error: "Socket not available." });
          return;
        }
        let settled = false;
        const timeoutId = setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve({ ok: false, error: "Message send timeout." });
          }
        }, 8000);

        socketRef.current.emit(eventName, payload, (ack: ChatSendAck) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          if (ack && typeof ack.ok === "boolean") {
            resolve(ack);
          } else {
            resolve({ ok: true });
          }
        });
      });
    },
    []
  );

  const sendChatMessage = useCallback(
    async (payload: ChatMessageInputPayload) => {
      return await emitWithAck("chat:send", payload);
    },
    [emitWithAck]
  );

  const sendChatAttachment = useCallback(
    async (payload: ChatMessageInputPayload) => {
      return await emitWithAck("chat:attachment:send", payload);
    },
    [emitWithAck]
  );

  const sendChatTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("chat:typing", { isTyping, timestamp: Date.now() });
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
      unregisterSocketListeners(socketRef.current);
    }
  }, [unregisterSocketListeners]);

  const disconnectSocket = useCallback(() => {
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
      sendChatAttachment,
      sendChatTyping,
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
    }),
    [
      initializeSocket,
      sendSignal,
      joinQueue,
      skipPeer,
      sendEndCall,
      sendChatMessage,
      sendChatAttachment,
      sendChatTyping,
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
