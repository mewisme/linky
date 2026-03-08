"use client";

import { ChatSidebar } from "./chat-sidebar";
import { useChatPanelStore } from "@/features/chat/model/chat-panel-store";
import { useEffect } from "react";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";
import { usePathname } from "next/navigation";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";

export function ChatPanelHost() {
  const pathname = usePathname();

  const isChatPanelOpen = useChatPanelStore((s) => s.isChatPanelOpen);
  const closeChatPanel = useChatPanelStore((s) => s.closeChatPanel);
  const setChatPanelOpen = useChatPanelStore((s) => s.setChatPanelOpen);

  const chatMessages = useVideoChatStore((s) => s.chatMessages);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isPeerTyping = useVideoChatStore((s) => s.isPeerTyping);

  const { isInActiveCall, sendMessage, sendTyping } = useGlobalCallContext();

  useEffect(() => {
    if (!isInActiveCall && isChatPanelOpen) closeChatPanel();
  }, [isInActiveCall, isChatPanelOpen, closeChatPanel]);

  if (!isInActiveCall) return null;

  if (pathname !== "/call") return null;

  return (
    <ChatSidebar
      isOpen={isChatPanelOpen}
      onClose={() => setChatPanelOpen(false)}
      chatMessages={chatMessages}
      connectionStatus={connectionStatus}
      isPeerTyping={isPeerTyping}
      onSendMessage={sendMessage}
      onSendTyping={sendTyping}
    />
  );
}

