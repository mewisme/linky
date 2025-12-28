"use client";

import { useMemo, useReducer } from "react";

export type ConnectionStatus = "idle" | "searching" | "connecting" | "connected" | "peer-disconnected";

export interface ChatMessage {
  id: string;
  message: string;
  timestamp: number;
  senderId: string;
  isOwn: boolean;
}

interface VideoChatState {
  // Media state
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  remoteMuted: boolean;

  // Connection state
  connectionStatus: ConnectionStatus;

  // Chat state
  chatMessages: ChatMessage[];

  // Error state
  error: string | null;
}

type VideoChatAction =
  | { type: "SET_LOCAL_STREAM"; payload: MediaStream | null }
  | { type: "SET_REMOTE_STREAM"; payload: MediaStream | null }
  | { type: "SET_CONNECTION_STATUS"; payload: ConnectionStatus }
  | { type: "SET_MUTED"; payload: boolean }
  | { type: "SET_VIDEO_OFF"; payload: boolean }
  | { type: "SET_REMOTE_MUTED"; payload: boolean }
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
  | { type: "CLEAR_CHAT_MESSAGES" }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET_STATE" }
  | { type: "RESET_PEER_STATE" }; // Reset without clearing local stream

const initialState: VideoChatState = {
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isVideoOff: false,
  remoteMuted: false,
  connectionStatus: "idle",
  chatMessages: [],
  error: null,
};

/**
 * Reducer for video chat UI state management
 * Centralizes all state updates to prevent unnecessary re-renders
 */
function videoChatReducer(state: VideoChatState, action: VideoChatAction): VideoChatState {
  switch (action.type) {
    case "SET_LOCAL_STREAM":
      return { ...state, localStream: action.payload };

    case "SET_REMOTE_STREAM":
      return { ...state, remoteStream: action.payload };

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

    case "RESET_STATE":
      return initialState;

    case "RESET_PEER_STATE":
      // Reset peer-related state but keep local stream and settings
      return {
        ...state,
        remoteStream: null,
        remoteMuted: false,
        chatMessages: [],
        connectionStatus: "idle",
        error: null,
      };

    default:
      return state;
  }
}

/**
 * Hook for managing video chat UI state with useReducer
 * Provides type-safe actions and memoized selectors
 */
export function useVideoChatState() {
  const [state, dispatch] = useReducer(videoChatReducer, initialState);

  // Memoized action creators
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

      resetState: () => {
        dispatch({ type: "RESET_STATE" });
      },

      resetPeerState: () => {
        dispatch({ type: "RESET_PEER_STATE" });
      },
    }),
    []
  );

  return {
    state,
    actions,
  };
}

