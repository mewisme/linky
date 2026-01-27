"use client";

import { useEffect, useState } from "react";

import { useVideoChatStore } from "@/stores/video-chat-store";

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function CallTimer() {
  const remoteStream = useVideoChatStore((s) => s.remoteStream);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const callStartedAt = useVideoChatStore((s) => s.callStartedAt);

  const hasPeer = !!remoteStream;
  const shouldShowTimer =
    hasPeer &&
    (connectionStatus === "connected" || connectionStatus === "reconnecting") &&
    callStartedAt != null;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldShowTimer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [shouldShowTimer]);

  const callDuration =
    shouldShowTimer && callStartedAt != null
      ? Math.floor((now - callStartedAt) / 1000)
      : 0;

  if (!shouldShowTimer) return null;

  return (
    <div
      className="absolute top-4 left-1/2 z-20 -translate-x-1/2 pointer-events-none"
      data-reaction-exclude
      data-testid="chat-call-timer"
    >
      <div className="inline-flex items-center justify-center rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md min-w-14">
        <span className="text-sm font-mono font-medium text-white tabular-nums">
          {formatTime(callDuration)}
        </span>
      </div>
    </div>
  );
}
