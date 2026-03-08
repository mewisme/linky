"use client";

import { Button } from "@ws/ui/components/ui/button";
import { FullPageChatContent } from "./full-page-chat-content";
import { IconArrowLeft } from "@tabler/icons-react";
import { useEffect } from "react";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";
import { useRouter } from "next/navigation";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";

export function FullChatPageClient() {
  const router = useRouter();

  const chatMessages = useVideoChatStore((s) => s.chatMessages);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isPeerTyping = useVideoChatStore((s) => s.isPeerTyping);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);

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
      <header className="flex shrink-0 items-center justify-between bg-background px-4 py-3">
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
      <FullPageChatContent
        chatMessages={chatMessages}
        connectionStatus={connectionStatus}
        onSendMessage={sendMessage}
        onSendTyping={sendTyping}
        isPeerTyping={isPeerTyping}
        peerInfo={peerInfo ? {
          avatarUrl: peerInfo.avatar_url,
          displayName: `${peerInfo.first_name ?? ""} ${peerInfo.last_name ?? ""}`.trim() || "Peer",
        } : null}
      />
    </div>
  );
}
