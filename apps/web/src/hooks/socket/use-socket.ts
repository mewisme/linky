"use client";

import { useContext } from "react";
import {
  SocketContext,
  type SocketContextValue,
} from "@/components/providers/realtime/socket-provider";
import { useSocketStore } from "@/stores/socket-store";

export function useSocket(): SocketContextValue {
  const context = useContext(SocketContext);
  const connectionState = useSocketStore((s) => s.connectionState);
  const isHealthy = useSocketStore((s) => s.isHealthy);

  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }

  return {
    ...context,
    connectionState,
    isHealthy,
  };
}
