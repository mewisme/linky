import { FullChatPageClient } from "@/features/video-chat/ui/messaging/full-chat-page-client";

export default function CallChatPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden h-full">
      <FullChatPageClient />
    </div>
  );
}
