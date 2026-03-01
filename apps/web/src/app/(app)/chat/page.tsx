import { ChatPageContent } from "@/features/chat/ui/chat-page-content";
import { Suspense } from "react";
import { getFavorites } from "@/actions/resources/favorites";
import { getUserProgress } from "@/features/user/api/profile";

export default async function ChatPage() {
  const [initialProgress, initialFavorites] = await Promise.all([
    getUserProgress().catch(() => null),
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
