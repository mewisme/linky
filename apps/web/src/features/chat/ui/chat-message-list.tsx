"use client";

import { Activity } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import type { ChatMessage } from "@/features/chat/types/chat-message.types";
import { ChatMessageBubble } from "./chat-message-bubble";
import { cn } from "@ws/ui/lib/utils";
import { motion } from "@ws/ui/internal-lib/motion";
import { useTranslations } from "next-intl";

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

export interface PeerInfo {
  avatarUrl?: string | null;
  displayName: string;
}

export function ChatMessageList({
  chatMessages,
  isPeerTyping,
  peerInfo,
}: {
  chatMessages: ChatMessage[];
  isPeerTyping: boolean;
  peerInfo?: PeerInfo | null;
}) {
  const t = useTranslations("chat");
  return (
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
            ? t("failedToSend")
            : msg.localStatus === "sending"
              ? t("sending")
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
              <Activity mode={!msg.isOwn ? "visible" : "hidden"}>
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
        <div className="mt-4 flex gap-2">
          <Avatar className="size-8 shrink-0">
            <AvatarImage
              src={peerInfo?.avatarUrl ?? undefined}
              alt={peerInfo?.displayName ?? "Peer"}
            />
            <AvatarFallback className="text-xs font-medium">
              {(peerInfo?.displayName ?? "?").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex max-w-[75%] flex-col items-start">
            <div
              className={cn(
                "rounded-xl rounded-bl-sm px-3 py-2 text-xs text-muted-foreground",
                "bg-background/60 text-foreground"
              )}
            >
              Peer is typing...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
