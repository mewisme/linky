"use client";

import { useEffect, type ReactNode } from "react";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import type { UsersAPI } from "@/entities/user/types/users.types";

interface CallPageHydrateProps {
  initialProgress: UsersAPI.Progress.GetMe.Response | null;
  initialFavorites: ResourcesAPI.Favorites.Get.Response | null;
  children: ReactNode;
}

export function CallPageHydrate({
  initialProgress,
  initialFavorites,
  children,
}: CallPageHydrateProps) {
  useEffect(() => {
    useVideoChatStore.getState().setCallInitialData(
      initialProgress,
      initialFavorites
    );
  }, [initialProgress, initialFavorites]);

  return <>{children}</>;
}
