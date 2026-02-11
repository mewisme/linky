"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface IceServersState {
  servers: RTCIceServer[] | null;
  fetchedAt: number;
  ttl: number;
  lastFetchTimestamp: number;
  iceRestartCount: number;
  iceRestartWindowStart: number;
}

interface IceServersActions {
  setCache: (servers: RTCIceServer[], ttl: number) => void;
  clearCache: () => void;
  setLastFetchTimestamp: (ts: number) => void;
  setIceRestartState: (count: number, windowStart: number) => void;
  resetSession: () => void;
}

const initialState: IceServersState = {
  servers: null,
  fetchedAt: 0,
  ttl: 300_000,
  lastFetchTimestamp: 0,
  iceRestartCount: 0,
  iceRestartWindowStart: 0,
};

export const useIceServersStore = create<IceServersState & IceServersActions>()(
  persist(
    (set) => ({
      ...initialState,

      setCache: (servers, ttl) =>
        set({
          servers,
          fetchedAt: Date.now(),
          ttl,
        }),

      clearCache: () =>
        set({
          servers: null,
          fetchedAt: 0,
        }),

      setLastFetchTimestamp: (ts) => set({ lastFetchTimestamp: ts }),

      setIceRestartState: (iceRestartCount, iceRestartWindowStart) =>
        set({ iceRestartCount, iceRestartWindowStart }),

      resetSession: () =>
        set({
          iceRestartCount: 0,
          iceRestartWindowStart: 0,
        }),
    }),
    {
      name: "ice-servers-cache",
      partialize: (state) => ({
        servers: state.servers,
        fetchedAt: state.fetchedAt,
        ttl: state.ttl,
      }),
      skipHydration: true,
    }
  )
);
