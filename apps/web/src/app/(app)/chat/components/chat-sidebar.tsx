"use client";

import { Activity, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import type { ChatMessage, ChatMessageDraft } from "@/types/chat-message.types";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/components/ui/sheet";

import { ChatInputBar } from "./chat-input-bar";
import { ChatMessageBubble } from "./chat-message-bubble";
import type { ConnectionStatus } from "@/hooks/webrtc/use-video-chat";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "motion/react";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";

const GROUP_TIME_GAP = 2 * 60 * 1000;

function isSameGroup(
  a: ChatMessage | undefined,
  b: ChatMessage | undefined
) {
  if (!a || !b) return false;
  return (
    a.sender.socketId === b.sender.socketId &&
    Math.abs(a.timestamp - b.timestamp) < GROUP_TIME_GAP
  );
}

function ownBubbleRadius(isFirst: boolean, isMiddle: boolean, isLast: boolean) {
  if (isFirst) return "rounded-xl rounded-br-sm";
  if (isMiddle) return "rounded-xl rounded-tr-sm rounded-br-sm";
  if (isLast) return "rounded-xl rounded-tr-sm";
  return "rounded-xl";
}

function peerBubbleRadius(
  isFirst: boolean,
  isMiddle: boolean,
  isLast: boolean
) {
  if (isFirst) return "rounded-xl rounded-bl-sm";
  if (isMiddle) return "rounded-xl rounded-tl-sm rounded-bl-sm";
  if (isLast) return "rounded-xl rounded-tl-sm";
  return "rounded-xl";
}

function ChatContent({
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
        className="flex-1 bg-muted/30 px-4 py-3 h-96"
      >
        <div className="flex flex-col" data-testid="chat-messages-container">
          {chatMessages.map((msg, index) => {
            const prev = chatMessages[index - 1];
            const next = chatMessages[index + 1];

            const sameAsPrev = isSameGroup(prev, msg);
            const sameAsNext = isSameGroup(msg, next);

            const isFirst = !sameAsPrev && sameAsNext;
            const isMiddle = sameAsPrev && sameAsNext;
            const isLast = sameAsPrev && !sameAsNext;
            const isSingle = !sameAsPrev && !sameAsNext;

            if (msg.type === "system") {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  layout={false}
                  className="mt-4"
                >
                  <ChatMessageBubble message={msg} />
                </motion.div>
              );
            }

            const statusLabel =
              msg.localStatus === "failed"
                ? "Failed to send"
                : msg.localStatus === "sending"
                  ? "Sending..."
                  : null;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                layout={false}
                className={cn(
                  "flex gap-2",
                  sameAsPrev ? "mt-0.5" : "mt-4"
                )}
              >
                {!msg.isOwn && !sameAsPrev ? (
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage
                      src={msg.sender.avatarUrl || undefined}
                      alt={msg.sender.displayName || "User"}
                    />
                    <AvatarFallback className="text-xs font-medium">
                      {(msg.sender.displayName || msg.sender.socketId).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Activity mode={!msg.isOwn ? 'visible' : 'hidden'}>
                    <div className="size-8 shrink-0" />
                  </Activity>
                )}

                <div
                  className={cn(
                    "flex max-w-[75%] flex-col",
                    msg.isOwn
                      ? "ml-auto items-end"
                      : "items-start"
                  )}
                  data-testid={`chat-message-${msg.id}`}
                >
                  <ChatMessageBubble
                    message={msg}
                    className={cn(
                      "max-w-full",
                      msg.isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/60 text-foreground",
                      msg.isOwn
                        ? ownBubbleRadius(isFirst, isMiddle, isLast)
                        : peerBubbleRadius(isFirst, isMiddle, isLast)
                    )}
                  />

                  {(isLast || isSingle) && (
                    <span
                      className={cn(
                        "mt-1 text-xs text-muted-foreground",
                        msg.isOwn ? "text-right" : "text-left"
                      )}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {statusLabel ? ` · ${statusLabel}` : ""}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
          {isPeerTyping && (
            <div className="mt-3 text-xs text-muted-foreground">
              Peer is typing...
            </div>
          )}
        </div>
      </ScrollArea>

      <ChatInputBar
        connectionStatus={connectionStatus}
        onSendMessage={onSendMessage}
        onSendTyping={onSendTyping}
      />
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="flex h-[80vh] flex-col z-110!">
          <DrawerHeader>
            <DrawerTitle>Chat</DrawerTitle>
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
        <SheetHeader className="border-t border-b p-4">
          <SheetTitle>Chat</SheetTitle>
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
