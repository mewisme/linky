"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { toast } from "@ws/ui/components/ui/sonner";
import { useSocket } from "@/features/realtime/hooks/use-socket";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import { useUserContext } from "@/providers/user/user-provider";

interface FloatingReaction {
  id: string;
  type: string;
  tapPosition?: { x: number; y: number };
  isLocal: boolean;
}

interface ReactionEffectContextValue {
  triggerLocalReaction: (tapPosition: { x: number; y: number }, type?: string) => void;
  emitReaction: (count: number, type?: string) => void;
  triggerRemoteReactions: (count: number, type?: string) => void;
  reactions: FloatingReaction[];
  removeReaction: (id: string) => void;
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

const STREAK_TOAST_DEBOUNCE_MS = 2000;

export function ReactionEffectProvider({ children }: ReactionEffectProviderProps) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const { socket } = useSocket();
  const { store } = useUserContext();
  const { play } = useSoundWithSettings();
  const currentUserIdRef = useRef<string | null>(null);
  const lastStreakToastAtRef = useRef(0);
  // eslint-disable-next-line react-hooks/refs
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
    const handleStreakCompleted = (data: {
      userId: string;
      streakCount: number;
      date: string;
      freezeUsed?: boolean;
    }) => {
      const current = currentUserIdRef.current;
      if (!current || data.userId !== current) return;
      const now = Date.now();
      if (now - lastStreakToastAtRef.current < STREAK_TOAST_DEBOUNCE_MS) return;
      lastStreakToastAtRef.current = now;
      if (data.freezeUsed) {
        toast.success("Streak saved by freeze");
      } else {
        toast.success("Streak completed! Keep it going!");
        play("reward");
      }
    };
    socket.on(STREAK_COMPLETED_EVENT, handleStreakCompleted);
    return () => {
      socket.off(STREAK_COMPLETED_EVENT, handleStreakCompleted);
    };
  }, [play, socket]);

  const value: ReactionEffectContextValue = {
    triggerLocalReaction,
    emitReaction,
    triggerRemoteReactions,
    reactions,
    removeReaction,
  };

  return (
    <ReactionEffectContext.Provider value={value}>
      {children}
    </ReactionEffectContext.Provider>
  );
}
