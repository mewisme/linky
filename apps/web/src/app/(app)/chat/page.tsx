import { ChatPageContent } from "./components/chat-page-content";
import { Suspense } from "react";
import { getFavorites } from "@/lib/actions/resources/favorites";
import { getUserProgress } from "@/lib/actions/user/profile";
import { getUserTimezone } from "@/utils/timezone";

export default async function ChatPage() {
  const timezone = getUserTimezone();
  const [initialProgress, initialFavorites] = await Promise.all([
    getUserProgress(timezone).catch(() => null),
    getFavorites().catch(() => null),
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
