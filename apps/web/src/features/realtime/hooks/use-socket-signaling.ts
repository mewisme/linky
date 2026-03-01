"use client";

import * as Sentry from "@sentry/nextjs";
import { useRef, useCallback, useEffect, useMemo, type RefObject } from "react";
import { publishPresence } from "@/lib/messaging/mqtt-client";
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

export function useSocketSignaling(): UseSocketSignalingReturn {
  const { socket: globalSocket, registerCallbacks, unregisterCallbacks } = useSocket();
  const socketRef = useRef<Socket | null>(globalSocket);
  const callbacksRef = useRef<SocketCallbacks | null>(null);
  const currentSocketIdRef = useRef<string | null>(null);
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
      socketHealthMonitor.markEventReceived();
      callbacks.onPeerLeft(data);
    });

    socket.on("peer-skipped", (data) => {
      publishPresence('matching');
      callbacks.onPeerSkipped(data);
    });

    socket.on("skipped", (data) => {
      publishPresence('matching');
      callbacks.onSkipped(data);
    });

    socket.on("end-call", (data) => {
      publishPresence('available');
      socketHealthMonitor.markEventReceived();
      callbacks.onEndCall(data);
    });

    socket.on("chat:message", (data) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onChatMessage(data);
    });

    socket.on("chat:typing", (data) => {
      publishPresence('in_call');
      socketHealthMonitor.markEventReceived();
      callbacks.onChatTyping(data);
    });

    socket.on("chat:error", (data) => {
      callbacks.onChatError(data);
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

    socket.on("dequeued", (data) => {
      publishPresence('available');
      callbacks.onDequeued(data);
    });

    socket.on("error", (data) => {
      Sentry.logger.error("Socket error", { message: data.message });
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
        Sentry.logger.error("Socket not available from provider");
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
        socket.removeAllListeners("chat:message");
        socket.removeAllListeners("chat:typing");
        socket.removeAllListeners("chat:error");
        socket.removeAllListeners("mute-toggle");
        socket.removeAllListeners("video-toggle");
        socket.removeAllListeners("screen-share:toggle");
        socket.removeAllListeners("queue-timeout");
        socket.removeAllListeners("dequeued");
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
        onResyncRequired: callbacks.onResyncRequired,
        onForcedTeardown: callbacks.onForcedTeardown,
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
      socketRef.current.removeAllListeners("joined-queue");
      socketRef.current.removeAllListeners("matched");
      socketRef.current.removeAllListeners("signal");
      socketRef.current.removeAllListeners("peer-left");
      socketRef.current.removeAllListeners("peer-skipped");
      socketRef.current.removeAllListeners("skipped");
      socketRef.current.removeAllListeners("end-call");
      socketRef.current.removeAllListeners("chat:message");
      socketRef.current.removeAllListeners("chat:typing");
      socketRef.current.removeAllListeners("chat:error");
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
