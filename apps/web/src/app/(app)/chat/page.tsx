import { ChatPageContent } from "./components/chat-page-content";
import type { ResourcesAPI } from "@/types/resources.types";
import { Suspense } from "react";
import type { UsersAPI } from "@/types/users.types";
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";
import { getUserTimezone } from "@/utils/timezone";

async function fetchProgress(): Promise<UsersAPI.Progress.GetMe.Response | null> {
  try {
    return await serverFetch<UsersAPI.Progress.GetMe.Response>(
      backendUrl.users.progress(),
      {
        token: true,
        headers: { "x-user-timezone": getUserTimezone() },
      }
    );
  } catch {
    return null;
  }
}

async function fetchFavorites(): Promise<ResourcesAPI.Favorites.Get.Response | null> {
  try {
    return await serverFetch<ResourcesAPI.Favorites.Get.Response>(
      backendUrl.resources.favorites(),
      { token: true }
    );
  } catch {
    return null;
  }
}

export default async function ChatPage() {
  const [initialProgress, initialFavorites] = await Promise.all([
    fetchProgress(),
    fetchFavorites(),
  ]);
  return (
    <Suspense fallback={<main className="relative flex flex-1 flex-col overflow-hidden h-full" />}>
      <ChatPageContent
        initialProgress={initialProgress}
        initialFavorites={initialFavorites}
      />
    </Suspense>
  );
}
