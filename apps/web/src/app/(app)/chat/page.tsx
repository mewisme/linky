import { Suspense } from "react";
import { ChatPageContent } from "./chat-page-content";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";
import { getUserTimezone } from "@/utils/timezone";
import type { ResourcesAPI } from "@/types/resources.types";
import type { UsersAPI } from "@/types/users.types";

async function fetchProgress(): Promise<UsersAPI.Progress.GetMe.Response | null> {
  try {
    return await fetchData<UsersAPI.Progress.GetMe.Response>(
      apiUrl.users.progress(),
      {
        token: true,
        headers: {
          "x-user-timezone": getUserTimezone(),
        },
      }
    );
  } catch {
    return null;
  }
}

async function fetchFavorites(): Promise<ResourcesAPI.Favorites.Get.Response | null> {
  try {
    return await fetchData<ResourcesAPI.Favorites.Get.Response>(
      apiUrl.resources.favorites(),
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
