import { useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/types/chat-message.types";

export function useChatUnreadIndicator(chatMessages: ChatMessage[], isChatOpen: boolean) {
  const lastReadMessageCountRef = useRef(0);
  const isInitialMountRef = useRef(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    if (isChatOpen) {
      lastReadMessageCountRef.current = chatMessages.length;
      setHasUnreadMessages(false);
      isInitialMountRef.current = false;
      return;
    }

    if (isInitialMountRef.current) {
      lastReadMessageCountRef.current = chatMessages.length;
      setHasUnreadMessages(false);
      isInitialMountRef.current = false;
      return;
    }

    const unreadCount = chatMessages.length - lastReadMessageCountRef.current;
    const newMessages = chatMessages.slice(lastReadMessageCountRef.current);
    const hasNewMessagesFromOthers = newMessages.some((msg) => !msg.isOwn);
    setHasUnreadMessages(unreadCount > 0 && hasNewMessagesFromOthers);
  }, [isChatOpen, chatMessages]);

  useEffect(() => {
    if (chatMessages.length === 0) {
      lastReadMessageCountRef.current = 0;
      setHasUnreadMessages(false);
    }
  }, [chatMessages.length]);

  return { hasUnreadMessages };
}

