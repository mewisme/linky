"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { useSocket } from "@/hooks/socket/use-socket";
import { useUserContext } from "@/components/providers/user/user-provider";

interface FloatingReaction {
  id: string;
  type: string;
  tapPosition?: { x: number; y: number };
  isLocal: boolean;
}

export interface StreakCompletionPayload {
  streakCount: number;
  date: string;
}

interface ReactionEffectContextValue {
  triggerLocalReaction: (tapPosition: { x: number; y: number }, type?: string) => void;
  emitReaction: (count: number, type?: string) => void;
  triggerRemoteReactions: (count: number, type?: string) => void;
  reactions: FloatingReaction[];
  removeReaction: (id: string) => void;
  streakCompletion: StreakCompletionPayload | null;
  triggerStreakCompletion: (payload: StreakCompletionPayload) => void;
  clearStreakCompletion: () => void;
}

const ReactionEffectContext = createContext<ReactionEffectContextValue | null>(null);

export function useReactionEffectContext() {
  const context = useContext(ReactionEffectContext);
  if (!context) {
    throw new Error("useReactionEffectContext must be used within ReactionEffectProvider");
  }
  return context;
}

interface ReactionEffectProviderProps {
  children: React.ReactNode;
}

const STREAK_COMPLETED_EVENT = "streak:completed";

export function ReactionEffectProvider({ children }: ReactionEffectProviderProps) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [streakCompletion, setStreakCompletion] = useState<StreakCompletionPayload | null>(null);
  const { socket } = useSocket();
  const { store } = useUserContext();
  const currentUserIdRef = useRef<string | null>(null);
  const streakActiveRef = useRef(false);
  currentUserIdRef.current = store.user?.id ?? null;

  const triggerLocalReaction = useCallback((tapPosition: { x: number; y: number }, type: string = "heart") => {
    const id = `local-${Date.now()}-${Math.random()}`;
    setReactions((prev) => [...prev, { id, type, tapPosition, isLocal: true }]);
  }, []);

  const emitReaction = useCallback((count: number, type: string = "heart") => {
    if (count <= 0) return;
    if (!socket?.connected) return;
    socket.emit("reaction:triggered", { count, type, timestamp: Date.now() });
  }, [socket]);

  const triggerRemoteReactions = useCallback((count: number, type: string = "heart") => {
    const baseTime = Date.now();
    const newReactions: FloatingReaction[] = Array.from({ length: count }, (_, i) => ({
      id: `remote-${baseTime}-${i}-${Math.random()}`,
      type,
      isLocal: false,
    }));
    setReactions((prev) => [...prev, ...newReactions]);
  }, []);

  const removeReaction = useCallback((id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const triggerStreakCompletion = useCallback((payload: StreakCompletionPayload) => {
    if (streakActiveRef.current) return;
    streakActiveRef.current = true;
    setStreakCompletion(payload);
  }, []);

  const clearStreakCompletion = useCallback(() => {
    streakActiveRef.current = false;
    setStreakCompletion(null);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReaction = (data: { count: number; type?: string; timestamp: number }) => {
      triggerRemoteReactions(data.count, data.type || "heart");
    };
    socket.on("reaction:triggered", handleReaction);
    return () => {
      socket.off("reaction:triggered", handleReaction);
    };
  }, [socket, triggerRemoteReactions]);

  useEffect(() => {
    if (!socket) return;
    const handleStreakCompleted = (data: { userId: string; streakCount: number; date: string }) => {
      const current = currentUserIdRef.current;
      if (!current || data.userId !== current) return;
      if (streakActiveRef.current) return;
      triggerStreakCompletion({ streakCount: data.streakCount, date: data.date });
    };
    socket.on(STREAK_COMPLETED_EVENT, handleStreakCompleted);
    return () => {
      socket.off(STREAK_COMPLETED_EVENT, handleStreakCompleted);
    };
  }, [socket, triggerStreakCompletion]);

  const value: ReactionEffectContextValue = {
    triggerLocalReaction,
    emitReaction,
    triggerRemoteReactions,
    reactions,
    removeReaction,
    streakCompletion,
    triggerStreakCompletion,
    clearStreakCompletion,
  };

  return (
    <ReactionEffectContext.Provider value={value}>
      {children}
    </ReactionEffectContext.Provider>
  );
}
