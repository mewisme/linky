import { FullChatPageClient } from "@/features/chat/ui/full-chat-page-client";

export default function CallChatPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden h-full">
      <FullChatPageClient />
    </div>
  );
}
