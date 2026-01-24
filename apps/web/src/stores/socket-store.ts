"use client";

import { create } from "zustand";

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

interface SocketStore {
  connectionState: ConnectionState;
  isHealthy: boolean;

  setConnectionState: (state: ConnectionState) => void;
  setIsHealthy: (healthy: boolean) => void;
}

export const useSocketStore = create<SocketStore>((set) => ({
  connectionState: "disconnected",
  isHealthy: false,

  setConnectionState: (connectionState) => set({ connectionState }),
  setIsHealthy: (isHealthy) => set({ isHealthy }),
}));
