"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useSocket } from "@/hooks/socket/use-socket";

interface HeartReaction {
  id: string;
  tapPosition?: { x: number; y: number };
  isLocal: boolean;
}

interface HeartReactionContextValue {
  triggerLocalHeart: (tapPosition: { x: number; y: number }) => void;
  emitHeartReaction: (count: number) => void;
  triggerRemoteHearts: (count: number) => void;
  hearts: HeartReaction[];
  removeHeart: (id: string) => void;
}

const HeartReactionContext = createContext<HeartReactionContextValue | null>(null);

export function useHeartReactionContext() {
  const context = useContext(HeartReactionContext);
  if (!context) {
    throw new Error("useHeartReactionContext must be used within HeartReactionProvider");
  }
  return context;
}

interface HeartReactionProviderProps {
  children: React.ReactNode;
}

export function HeartReactionProvider({ children }: HeartReactionProviderProps) {
  const [hearts, setHearts] = useState<HeartReaction[]>([]);
  const { socket } = useSocket();

  const triggerLocalHeart = useCallback((tapPosition: { x: number; y: number }) => {
    const id = `local-${Date.now()}-${Math.random()}`;
    setHearts((prev) => [...prev, { id, tapPosition, isLocal: true }]);
  }, []);

  const emitHeartReaction = useCallback((count: number) => {
    if (count <= 0) {
      return;
    }

    if (!socket || !socket.connected) {
      return;
    }

    socket.emit("reaction:heart", { count, timestamp: Date.now() });
  }, [socket]);

  const triggerRemoteHearts = useCallback((count: number) => {
    const baseTime = Date.now();
    const newHearts = Array.from({ length: count }, (_, i) => ({
      id: `remote-${baseTime}-${i}-${Math.random()}`,
      isLocal: false,
    }));
    setHearts((prev) => [...prev, ...newHearts]);
  }, []);

  const removeHeart = useCallback((id: string) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleHeartReaction = (data: { count: number; timestamp: number }) => {
      triggerRemoteHearts(data.count);
    };

    socket.on("reaction:heart", handleHeartReaction);

    return () => {
      socket.off("reaction:heart", handleHeartReaction);
    };
  }, [socket, triggerRemoteHearts]);

  const value: HeartReactionContextValue = {
    triggerLocalHeart,
    emitHeartReaction,
    triggerRemoteHearts,
    hearts,
    removeHeart,
  };

  return <HeartReactionContext.Provider value={value}>{children}</HeartReactionContext.Provider>;
}
