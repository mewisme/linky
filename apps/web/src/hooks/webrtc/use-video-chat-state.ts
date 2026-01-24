"use client";

import { useMemo, useReducer } from "react";

import type { UsersAPI } from "@/types/users.types";

export type ConnectionStatus = "idle" | "searching" | "connecting" | "connected" | "reconnecting" | "peer-disconnected";

export function getConnectionStatusMessage(status: ConnectionStatus): string {
  const statusMessages: Record<ConnectionStatus, string> = {
    idle: "Ready",
    searching: "Searching...",
    connecting: "Connecting...",
    connected: "Connected",
    reconnecting: "Reconnecting...",
    "peer-disconnected": "Disconnected",
  };
  return statusMessages[status];
}

export interface ChatMessage {
  id: string;
  message: string;
  timestamp: number;
  senderId: string;
  senderName?: string;
  senderImageUrl?: string;
  isOwn: boolean;
}

interface VideoChatState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteMuted: boolean;
  connectionStatus: ConnectionStatus;
  callStartedAt: number | null;
  chatMessages: ChatMessage[];
  error: string | null;
  peerInfo: UsersAPI.PublicUserInfo | null;
}

type VideoChatAction =
  | { type: "SET_LOCAL_STREAM"; payload: MediaStream | null }
  | { type: "SET_REMOTE_STREAM"; payload: MediaStream | null }
  | { type: "SET_CONNECTION_STATUS"; payload: ConnectionStatus }
  | { type: "SET_CALL_STARTED_AT"; payload: number | null }
  | { type: "SET_MUTED"; payload: boolean }
  | { type: "SET_VIDEO_OFF"; payload: boolean }
  | { type: "SET_REMOTE_MUTED"; payload: boolean }
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
  | { type: "CLEAR_CHAT_MESSAGES" }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_PEER_INFO"; payload: UsersAPI.PublicUserInfo | null }
  | { type: "RESET_STATE" }
  | { type: "RESET_PEER_STATE" }
  | { type: "RESET_RUNTIME_STATE" };

const initialState: VideoChatState = {
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  remoteMuted: false,
  connectionStatus: "idle",
  callStartedAt: null,
  chatMessages: [],
  error: null,
  peerInfo: null,
};

function videoChatReducer(state: VideoChatState, action: VideoChatAction): VideoChatState {
  switch (action.type) {
    case "SET_LOCAL_STREAM":
      return { ...state, localStream: action.payload };

    case "SET_REMOTE_STREAM":
      return {
        ...state,
        remoteStream: action.payload,
        ...(action.payload === null ? { callStartedAt: null } : {}),
      };

    case "SET_CALL_STARTED_AT":
      return { ...state, callStartedAt: action.payload };

    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };

    case "SET_MUTED":
      return { ...state, isMuted: action.payload };

    case "SET_VIDEO_OFF":
      return { ...state, isVideoOff: action.payload };

    case "SET_REMOTE_MUTED":
      return { ...state, remoteMuted: action.payload };

    case "ADD_CHAT_MESSAGE":
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };

    case "CLEAR_CHAT_MESSAGES":
      return { ...state, chatMessages: [] };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_PEER_INFO":
      return { ...state, peerInfo: action.payload };

    case "RESET_STATE":
      return initialState;

    case "RESET_PEER_STATE":
      return {
        ...state,
        remoteStream: null,
        remoteMuted: false,
        chatMessages: [],
        connectionStatus: "idle",
        callStartedAt: null,
        error: null,
        peerInfo: null,
      };

    case "RESET_RUNTIME_STATE":
      return {
        ...state,
        localStream: null,
        remoteStream: null,
        remoteMuted: false,
        chatMessages: [],
        connectionStatus: "idle",
        callStartedAt: null,
        error: null,
        peerInfo: null,
      };

    default:
      return state;
  }
}

export function useVideoChatState() {
  const [state, dispatch] = useReducer(videoChatReducer, initialState);

  const actions = useMemo(
    () => ({
      setLocalStream: (stream: MediaStream | null) => {
        dispatch({ type: "SET_LOCAL_STREAM", payload: stream });
      },

      setRemoteStream: (stream: MediaStream | null) => {
        dispatch({ type: "SET_REMOTE_STREAM", payload: stream });
      },

      setConnectionStatus: (status: ConnectionStatus) => {
        dispatch({ type: "SET_CONNECTION_STATUS", payload: status });
      },

      setCallStartedAt: (timestamp: number | null) => {
        dispatch({ type: "SET_CALL_STARTED_AT", payload: timestamp });
      },

      setMuted: (muted: boolean) => {
        dispatch({ type: "SET_MUTED", payload: muted });
      },

      setVideoOff: (videoOff: boolean) => {
        dispatch({ type: "SET_VIDEO_OFF", payload: videoOff });
      },

      setRemoteMuted: (muted: boolean) => {
        dispatch({ type: "SET_REMOTE_MUTED", payload: muted });
      },

      addChatMessage: (message: ChatMessage) => {
        dispatch({ type: "ADD_CHAT_MESSAGE", payload: message });
      },

      clearChatMessages: () => {
        dispatch({ type: "CLEAR_CHAT_MESSAGES" });
      },

      setError: (error: string | null) => {
        dispatch({ type: "SET_ERROR", payload: error });
      },

      setPeerInfo: (peerInfo: UsersAPI.PublicUserInfo | null) => {
        dispatch({ type: "SET_PEER_INFO", payload: peerInfo });
      },

      resetState: () => {
        dispatch({ type: "RESET_STATE" });
      },

      resetPeerState: () => {
        dispatch({ type: "RESET_PEER_STATE" });
      },

      resetRuntimeState: () => {
        dispatch({ type: "RESET_RUNTIME_STATE" });
      },
    }),
    []
  );

  return {
    state,
    actions,
  };
}
