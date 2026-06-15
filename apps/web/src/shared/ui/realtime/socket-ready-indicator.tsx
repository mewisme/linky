"use client";

import { useEffect } from "react";

import { useSocketStore } from "@/features/realtime/model/socket-store";

export function SocketReadyIndicator() {
  const connectionState = useSocketStore((state) => state.connectionState);

  useEffect(() => {
    document.body.setAttribute(
      "data-socket-ready",
      connectionState === "connected" ? "true" : "false",
    );
  }, [connectionState]);

  return null;
}
