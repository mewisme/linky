"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { getFavorites } from "@/actions/resources/favorites";
import { getUserProgress } from "@/features/user/api/profile";
import { useQuery } from "@ws/ui/internal-lib/react-query";

interface CallPageHydrateProps {
  initialProgress: UsersAPI.Progress.GetMe.Response | null;
  initialFavorites: ResourcesAPI.Favorites.Get.Response | null;
  children: ReactNode;
}

const wasInCall = (s: string) => s === "in_call" || s === "reconnecting";
const isAfterCall = (s: string) => s === "ended" || s === "idle";

export function CallPageHydrate({
  initialProgress,
  initialFavorites,
  children,
}: CallPageHydrateProps) {
  const prevStatusRef = useRef(useVideoChatStore.getState().connectionStatus);

  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ["user-progress"],
    queryFn: () => getUserProgress(),
    initialData: initialProgress ?? undefined,
    staleTime: Infinity,
  });

  const { data: favorites, refetch: refetchFavorites } = useQuery({
    queryKey: ["user-favorites"],
    queryFn: () => getFavorites(),
    initialData: initialFavorites ?? undefined,
    staleTime: Infinity,
  });

  useEffect(() => {
    useVideoChatStore.getState().setCallInitialData(
      progress ?? null,
      favorites ?? null
    );
  }, [progress, favorites]);

  useEffect(() => {
    const unsub = useVideoChatStore.subscribe((state) => {
      const prev = prevStatusRef.current;
      const next = state.connectionStatus;
      prevStatusRef.current = next;
      if (wasInCall(prev) && isAfterCall(next)) {
        refetchProgress();
        refetchFavorites();
      }
    });
    return unsub;
  }, [refetchProgress, refetchFavorites]);

  return <>{children}</>;
}
