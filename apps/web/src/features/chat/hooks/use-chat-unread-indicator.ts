import * as Sentry from "@sentry/nextjs";

import { useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/features/chat/types/chat-message.types";

export function useChatUnreadIndicator(chatMessages: ChatMessage[], isChatOpen: boolean) {
  const lastReadMessageCountRef = useRef(0);
  const isInitialMountRef = useRef(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    Sentry.metrics.count("use_chat_unread_indicator", 1);
    if (isChatOpen) {
      Sentry.metrics.count("use_chat_unread_indicator_chat_open", 1);
      lastReadMessageCountRef.current = chatMessages.length;
      setHasUnreadMessages(false);
      isInitialMountRef.current = false;
      return;
    }

    if (isInitialMountRef.current) {
      Sentry.metrics.count("use_chat_unread_indicator_initial_mount", 1);
      lastReadMessageCountRef.current = chatMessages.length;
      setHasUnreadMessages(false);
      isInitialMountRef.current = false;
      return;
    }

    Sentry.metrics.count("use_chat_unread_indicator_calculate_unread_count", 1);
    const unreadCount = chatMessages.length - lastReadMessageCountRef.current;
    const newMessages = chatMessages.slice(lastReadMessageCountRef.current);
    const hasNewMessagesFromOthers = newMessages.some((msg) => !msg.isOwn);
    Sentry.metrics.count("use_chat_unread_indicator_set_has_unread_messages", 1);
    setHasUnreadMessages(unreadCount > 0 && hasNewMessagesFromOthers);
  }, [isChatOpen, chatMessages]);

  useEffect(() => {
    if (chatMessages.length === 0) {
      Sentry.metrics.count("use_chat_unread_indicator_chat_messages_empty", 1);
      lastReadMessageCountRef.current = 0;
      setHasUnreadMessages(false);
    }
  }, [chatMessages.length]);

  Sentry.metrics.count("use_chat_unread_indicator_return", 1);
  return { hasUnreadMessages };
}

