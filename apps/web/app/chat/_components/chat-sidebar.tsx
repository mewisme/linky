"use client";

import type { ChatMessage, ConnectionStatus } from "@/hooks/use-video-chat";
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
import { useEffect, useRef, useState } from "react";

import { AnimateIcon } from "@repo/ui/components/animate-ui/icons/icon";
import { Button } from "@repo/ui/components/ui/button";
import { ScrollArea } from "@repo/ui/components/ui/scroll-area";
import { Send } from "@repo/ui/components/animate-ui/icons/send";
import { cn } from "@repo/ui/lib/utils";
import { motion } from "motion/react";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";

/* ------------------------------------------------------------------ */
/* Constants & helpers */
/* ------------------------------------------------------------------ */

const GROUP_TIME_GAP = 2 * 60 * 1000; // 2 minutes

function isSameGroup(
  a: ChatMessage | undefined,
  b: ChatMessage | undefined
) {
  if (!a || !b) return false;
  return (
    a.senderId === b.senderId &&
    Math.abs(a.timestamp - b.timestamp) < GROUP_TIME_GAP
  );
}

function ownBubbleRadius(isFirst: boolean, isMiddle: boolean, isLast: boolean) {
  if (isFirst) return "rounded-2xl rounded-br-sm";
  if (isMiddle) return "rounded-2xl rounded-tr-sm rounded-br-sm";
  if (isLast) return "rounded-2xl rounded-tr-sm";
  return "rounded-2xl";
}

function peerBubbleRadius(
  isFirst: boolean,
  isMiddle: boolean,
  isLast: boolean
) {
  if (isFirst) return "rounded-2xl rounded-bl-sm";
  if (isMiddle) return "rounded-2xl rounded-tl-sm rounded-bl-sm";
  if (isLast) return "rounded-2xl rounded-tl-sm";
  return "rounded-2xl";
}

/* ------------------------------------------------------------------ */
/* Chat Content */
/* ------------------------------------------------------------------ */

function ChatContent({
  chatMessages,
  connectionStatus,
  onSendMessage,
  scrollAreaRef,
}: {
  chatMessages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  onSendMessage: (message: string) => void;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
}) {
  const inputRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);

  /* Auto scroll */
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [chatMessages, scrollAreaRef]);

  const sendMessage = () => {
    const el = inputRef.current;
    if (!el || connectionStatus !== "connected") return;

    const text = el.innerText.trim();
    if (!text) return;

    onSendMessage(text);
    el.innerText = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col text-base">
      {/* Messages */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1 bg-muted/30 px-4 py-3"
      >
        <div className="flex flex-col">
          {chatMessages.map((msg, index) => {
            const prev = chatMessages[index - 1];
            const next = chatMessages[index + 1];

            const sameAsPrev = isSameGroup(prev, msg);
            const sameAsNext = isSameGroup(msg, next);

            const isFirst = !sameAsPrev && sameAsNext;
            const isMiddle = sameAsPrev && sameAsNext;
            const isLast = sameAsPrev && !sameAsNext;
            const isSingle = !sameAsPrev && !sameAsNext;

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
                {/* Avatar (peer only, left side) */}
                {!msg.isOwn && !sameAsPrev ? (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {msg.senderId.slice(0, 2).toUpperCase()}
                  </div>
                ) : (
                  !msg.isOwn && <div className="size-8 shrink-0" />
                )}

                {/* Bubble wrapper */}
                <div
                  className={cn(
                    "flex max-w-[75%] flex-col",
                    msg.isOwn
                      ? "ml-auto items-end"
                      : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-2 text-base shadow-sm",
                      msg.isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground",
                      msg.isOwn
                        ? ownBubbleRadius(isFirst, isMiddle, isLast)
                        : peerBubbleRadius(isFirst, isMiddle, isLast)
                    )}
                  >
                    {msg.message}
                  </div>

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
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex items-end gap-2 border-t bg-background/80 backdrop-blur px-3 py-2 pb-safe">
        <div
          ref={inputRef}
          contentEditable
          role="textbox"
          spellCheck
          data-placeholder="Type a message..."
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          className={cn(
            "no-ios-zoom relative max-h-40 min-h-[40px] flex-1 overflow-y-auto rounded-2xl border bg-background px-4 py-2 text-base outline-none",
            "focus:border-primary focus-visible:ring-1 focus-visible:ring-primary/30",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
          )}
        />

        <AnimateIcon animateOnTap animateOnHover>
          <Button
            size="icon"
            className="rounded-full shrink-0"
            disabled={connectionStatus !== "connected"}
            onClick={sendMessage}
          >
            <Send size={16} />
          </Button>
        </AnimateIcon>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar wrapper */
/* ------------------------------------------------------------------ */

export function ChatSidebar({
  isOpen,
  onClose,
  chatMessages,
  connectionStatus,
  onSendMessage,
}: {
  isOpen: boolean;
  onClose: () => void;
  chatMessages: ChatMessage[];
  connectionStatus: ConnectionStatus;
  onSendMessage: (message: string) => void;
}) {
  const isMobile = useIsMobile();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="flex h-[80vh] flex-col">
          <DrawerHeader>
            <DrawerTitle>Chat</DrawerTitle>
          </DrawerHeader>
          <ChatContent
            chatMessages={chatMessages}
            connectionStatus={connectionStatus}
            onSendMessage={onSendMessage}
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
        className="top-12 bottom-0 h-[calc(100vh-3rem)] w-80 p-0 [&>button]:hidden"
      >
        <SheetHeader className="border-b p-4">
          <SheetTitle>Chat</SheetTitle>
        </SheetHeader>
        <ChatContent
          chatMessages={chatMessages}
          connectionStatus={connectionStatus}
          onSendMessage={onSendMessage}
          scrollAreaRef={scrollAreaRef}
        />
      </SheetContent>
    </Sheet>
  );
}
