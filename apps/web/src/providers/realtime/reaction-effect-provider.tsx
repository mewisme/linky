"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useSocket } from "@/features/realtime/hooks/use-socket";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import { useUserContext } from "@/providers/user/user-provider";
import { useQueryClient } from "@ws/ui/internal-lib/react-query";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { UsersAPI } from "@/entities/user/types/users.types";
import { STREAK_BURST_REACTION } from "@/shared/lib/reaction-display-type";
import { calculateLevelFromExp } from "@/shared/lib/level-from-exp";

type ReactionInputType = string | string[];
type ReactionMode = "single" | "burst";

interface FloatingReaction {
  id: string;
  type: ReactionInputType;
  mode: ReactionMode;
  tapPosition?: { x: number; y: number };
  isLocal: boolean;
}

interface ReactionEffectContextValue {
  triggerLocalReaction: (tapPosition: { x: number; y: number }, type?: ReactionInputType, mode?: ReactionMode) => void;
  emitReaction: (count: number, type?: ReactionInputType, mode?: ReactionMode) => void;
  triggerRemoteReactions: (count: number, type?: ReactionInputType, mode?: ReactionMode) => void;
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
const USER_PROGRESS_UPDATE_EVENT = "user:progress:update";

const STREAK_TOAST_DEBOUNCE_MS = 2000;
const STREAK_EVENT_DEDUP_WINDOW_MS = 30000;

function normalizeReactionDisplayTypes(input: ReactionInputType | undefined): string[] {
  const rawTypes = Array.isArray(input) ? input : [input ?? "heart"];
  const normalizedTypes = rawTypes.filter((type): type is string => typeof type === "string" && type.length > 0);

  if (normalizedTypes.length === 0) {
    return ["heart"];
  }

  return normalizedTypes;
}

export function ReactionEffectProvider({ children }: ReactionEffectProviderProps) {
  const t = useTranslations("call");
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const { socket } = useSocket();
  const { store } = useUserContext();
  const { play } = useSoundWithSettings();
  const queryClient = useQueryClient();
  const currentUserIdRef = useRef<string | null>(null);
  const lastStreakToastAtRef = useRef(0);
  const seenStreakEventKeysRef = useRef<Map<string, number>>(new Map());
  // eslint-disable-next-line react-hooks/refs
  currentUserIdRef.current = store.user?.id ?? null;

  const triggerLocalReaction = useCallback((
    tapPosition: { x: number; y: number },
    type: ReactionInputType = "heart",
    mode: ReactionMode = "single"
  ) => {
    const id = `local-${Date.now()}-${Math.random()}`;
    const normalizedTypes = normalizeReactionDisplayTypes(type);
    setReactions((prev) => [
      ...prev,
      {
        id,
        type: Array.isArray(type) ? normalizedTypes : normalizedTypes[0]!,
        mode,
        tapPosition,
        isLocal: true,
      },
    ]);
  }, []);

  const emitReaction = useCallback((count: number, type: ReactionInputType = "heart", mode: ReactionMode = "single") => {
    if (count <= 0) return;
    if (!socket?.connected) return;
    const normalizedTypes = normalizeReactionDisplayTypes(type);
    socket.emit("reaction:triggered", { count, type: normalizedTypes[0]!, mode, timestamp: Date.now() });
  }, [socket]);

  const triggerRemoteReactions = useCallback((count: number, type: ReactionInputType = "heart", mode: ReactionMode = "single") => {
    const baseTime = Date.now();
    const normalizedTypes = normalizeReactionDisplayTypes(type);
    const newReactions: FloatingReaction[] = Array.from({ length: count }, (_, i) => ({
      id: `remote-${baseTime}-${i}-${Math.random()}`,
      type: Array.isArray(type) ? normalizedTypes : normalizedTypes[0]!,
      mode,
      isLocal: false,
    }));
    setReactions((prev) => [...prev, ...newReactions]);
  }, []);

  const removeReaction = useCallback((id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleReaction = (data: { count: number; type?: string; mode?: ReactionMode; timestamp: number }) => {
      triggerRemoteReactions(data.count, data.type || "heart", data.mode ?? "single");
    };
    socket.on("reaction:triggered", handleReaction);
    return () => {
      socket.off("reaction:triggered", handleReaction);
    };
  }, [socket, triggerRemoteReactions]);

  useEffect(() => {
    if (!socket) return;
    const handleProgressUpdate = (data: UsersAPI.Progress.GetMe.Response) => {
      const normalizedLevel = data.expProgress?.totalExpSeconds != null
        ? calculateLevelFromExp(data.expProgress.totalExpSeconds).level
        : data.currentLevel;
      queryClient.setQueryData(["user-progress"], { ...data, currentLevel: normalizedLevel });
    };
    socket.on(USER_PROGRESS_UPDATE_EVENT, handleProgressUpdate);
    return () => {
      socket.off(USER_PROGRESS_UPDATE_EVENT, handleProgressUpdate);
    };
  }, [queryClient, socket]);

  useEffect(() => {
    if (!socket) return;
    const handleStreakCompleted = (data: {
      eventKey?: string;
      completedUserId?: string;
      userId: string;
      streakCount: number;
      date: string;
      freezeUsed?: boolean;
    }) => {
      if (useVideoChatStore.getState().connectionStatus !== "in_call") return;
      const actorUserId = data.completedUserId ?? data.userId;
      const current = currentUserIdRef.current;
      if (!current || actorUserId !== current) return;

      const now = Date.now();
      for (const [key, timestamp] of seenStreakEventKeysRef.current.entries()) {
        if (now - timestamp > STREAK_EVENT_DEDUP_WINDOW_MS) {
          seenStreakEventKeysRef.current.delete(key);
        }
      }
      const dedupeKey = data.eventKey ?? `${actorUserId}:${data.date}:${data.streakCount}:${data.freezeUsed ? "freeze" : "normal"}`;
      if (seenStreakEventKeysRef.current.has(dedupeKey)) return;
      seenStreakEventKeysRef.current.set(dedupeKey, now);
      if (now - lastStreakToastAtRef.current < STREAK_TOAST_DEBOUNCE_MS) return;
      lastStreakToastAtRef.current = now;
      if (data.freezeUsed) {
        toast.success(t("streakSavedByFreeze"));
      } else {
        toast.success(t("streakCompleted", { count: data.streakCount }));
        play("reward");
      }
      triggerRemoteReactions(1, STREAK_BURST_REACTION, "burst");
    };
    socket.on(STREAK_COMPLETED_EVENT, handleStreakCompleted);
    return () => {
      socket.off(STREAK_COMPLETED_EVENT, handleStreakCompleted);
    };
  }, [play, socket, triggerRemoteReactions, t]);

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
