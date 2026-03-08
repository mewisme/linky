"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, ChatMessageDraft } from "@/features/chat/types/chat-message.types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@ws/ui/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@ws/ui/components/ui/sheet";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@ws/ui/components/ui/button";
import { ChatInputBar } from "./chat-input-bar";
import { ChatMessageList } from "./chat-message-list";
import type { ConnectionStatus } from "@/features/call/hooks/webrtc/use-video-chat";
import { IconMaximize } from "@tabler/icons-react";
import { ScrollArea } from "@ws/ui/components/ui/scroll-area";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";

export function ChatContent({
  chatMessages,
  connectionStatus,
  onSendMessage,
  onSendTyping,
  isPeerTyping,
  scrollAreaRef,
}: {
  chatMessages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  onSendMessage: (draft: ChatMessageDraft) => void;
  onSendTyping: (isTyping: boolean) => void;
  isPeerTyping: boolean;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [chatMessages, scrollAreaRef]);

  return (
    <div className="flex h-full min-h-0 flex-col text-base" data-testid="chat-sidebar">
      <ScrollArea
        ref={scrollAreaRef}
        className="min-h-0 flex-1 bg-muted/30 px-4 py-3 h-96"
      >
        <ChatMessageList chatMessages={chatMessages} isPeerTyping={isPeerTyping} />
      </ScrollArea>

      <div className="shrink-0">
        <ChatInputBar
          connectionStatus={connectionStatus}
          onSendMessage={onSendMessage}
          onSendTyping={onSendTyping}
        />
      </div>
    </div>
  );
}

export function ChatSidebar({
  isOpen,
  onClose,
  chatMessages,
  connectionStatus,
  onSendMessage,
  onSendTyping,
  isPeerTyping,
}: {
  isOpen: boolean;
  onClose: () => void;
  chatMessages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  onSendMessage: (draft: ChatMessageDraft) => void;
  onSendTyping: (isTyping: boolean) => void;
  isPeerTyping: boolean;
}) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const showOpenFullChat = pathname === "/call";

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="flex h-[80vh] flex-col z-110!">
          <DrawerHeader className="flex flex-row items-center justify-between gap-2">
            <DrawerTitle>Chat</DrawerTitle>
            {showOpenFullChat && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/call/chat")}
                className="gap-1.5 shrink-0"
              >
                <IconMaximize className="size-4" />
                Open Full Chat
              </Button>
            )}
          </DrawerHeader>
          <ChatContent
            chatMessages={chatMessages}
            connectionStatus={connectionStatus}
            onSendMessage={onSendMessage}
            onSendTyping={onSendTyping}
            isPeerTyping={isPeerTyping}
            scrollAreaRef={scrollAreaRef}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="p-0 [&>button]:hidden"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-t border-b p-4">
          <SheetTitle>Chat</SheetTitle>
          {showOpenFullChat && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/call/chat")}
              className="gap-1.5 shrink-0"
            >
              <IconMaximize className="size-4" />
              Open Full Chat
            </Button>
          )}
        </SheetHeader>
        <ChatContent
          chatMessages={chatMessages}
          connectionStatus={connectionStatus}
          onSendMessage={onSendMessage}
          onSendTyping={onSendTyping}
          isPeerTyping={isPeerTyping}
          scrollAreaRef={scrollAreaRef}
        />
      </SheetContent>
    </Sheet>
  );
}
