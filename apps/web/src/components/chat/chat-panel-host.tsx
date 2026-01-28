"use client";

import { ChatSidebar } from "@/app/(app)/chat/components/chat-sidebar";
import { useChatPanelStore } from "@/stores/chat-panel-store";
import { useEffect } from "react";
import { useGlobalCallContext } from "@/components/providers/call/global-call-manager";
import { usePathname } from "next/navigation";
import { useVideoChatStore } from "@/stores/video-chat-store";

export function ChatPanelHost() {
  const pathname = usePathname();

  const isChatPanelOpen = useChatPanelStore((s) => s.isChatPanelOpen);
  const closeChatPanel = useChatPanelStore((s) => s.closeChatPanel);
  const setChatPanelOpen = useChatPanelStore((s) => s.setChatPanelOpen);

  const chatMessages = useVideoChatStore((s) => s.chatMessages);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isFloatingMode = useVideoChatStore((s) => s.isFloatingMode);

  const { isInActiveCall, sendMessage } = useGlobalCallContext();

  useEffect(() => {
    if (!isInActiveCall && isChatPanelOpen) closeChatPanel();
  }, [isInActiveCall, isChatPanelOpen, closeChatPanel]);

  if (!isInActiveCall) return null;

  const shouldRenderOnThisRoute = pathname !== "/chat" || !isFloatingMode;
  if (!shouldRenderOnThisRoute) return null;

  return (
    <ChatSidebar
      isOpen={isChatPanelOpen}
      onClose={() => setChatPanelOpen(false)}
      chatMessages={chatMessages}
      connectionStatus={connectionStatus}
      onSendMessage={sendMessage}
    />
  );
}

