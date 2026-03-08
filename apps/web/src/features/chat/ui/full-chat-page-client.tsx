"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ws/ui/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import { FullPageChatContent } from "./full-page-chat-content";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";

export function FullChatPageClient() {
  const router = useRouter();

  const chatMessages = useVideoChatStore((s) => s.chatMessages);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isPeerTyping = useVideoChatStore((s) => s.isPeerTyping);

  const { isInActiveCall, sendMessage, sendTyping } = useGlobalCallContext();

  useEffect(() => {
    if (!isInActiveCall) {
      router.push("/call");
    }
  }, [isInActiveCall, router]);

  if (!isInActiveCall) {
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between border-b bg-background px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/call")}
          className="gap-2"
        >
          <IconArrowLeft className="size-4" />
          Back to Call
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        <FullPageChatContent
          chatMessages={chatMessages}
          connectionStatus={connectionStatus}
          onSendMessage={sendMessage}
          onSendTyping={sendTyping}
          isPeerTyping={isPeerTyping}
        />
      </div>
    </div>
  );
}
