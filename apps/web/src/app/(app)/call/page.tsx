import { ChatPageContent } from "@/features/chat/ui/chat-page-content";
import { CallPageHydrate } from "@/features/chat/ui/call-page-hydrate";
import { Suspense } from "react";
import { getFavorites } from "@/actions/resources/favorites";
import { getUserProgress } from "@/features/user/api/profile";

export default async function CallPage() {
  const [initialProgress, initialFavorites] = await Promise.all([
    getUserProgress().catch(() => null),
    getFavorites().catch(() => null),
  ]);
  return (
    <Suspense fallback={null}>
      <CallPageHydrate
        initialProgress={initialProgress}
        initialFavorites={initialFavorites}
      >
        <ChatPageContent
          initialProgress={initialProgress}
          initialFavorites={initialFavorites}
        />
      </CallPageHydrate>
    </Suspense>
  );
}
