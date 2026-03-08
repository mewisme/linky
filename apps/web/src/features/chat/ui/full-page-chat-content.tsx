"use client";

import type { ChatMessage, ChatMessageDraft } from "@/features/chat/types/chat-message.types";
import { useEffect, useRef } from "react";

import { ChatInputBar } from "./chat-input-bar";
import { ChatMessageList } from "./chat-message-list";
import type { ConnectionStatus } from "@/features/call/hooks/webrtc/use-video-chat";
import { ScrollArea } from "@ws/ui/components/ui/scroll-area";

interface FullPageChatContentProps {
  chatMessages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  onSendMessage: (draft: ChatMessageDraft) => void;
  onSendTyping: (isTyping: boolean) => void;
  isPeerTyping: boolean;
}

export function FullPageChatContent({
  chatMessages,
  connectionStatus,
  onSendMessage,
  onSendTyping,
  isPeerTyping,
}: FullPageChatContentProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [chatMessages]);

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 flex-col overflow-hidden text-base">
      <ScrollArea
        ref={scrollAreaRef}
        className="min-h-0 flex-1 bg-muted/30 px-4 py-3 border"
      >
        <ChatMessageList
          chatMessages={chatMessages}
          isPeerTyping={isPeerTyping}
        />
      </ScrollArea>

      <div className="sticky bottom-0 z-10 shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <ChatInputBar
          connectionStatus={connectionStatus}
          onSendMessage={onSendMessage}
          onSendTyping={onSendTyping}
        />
      </div>
    </div>
  );
}