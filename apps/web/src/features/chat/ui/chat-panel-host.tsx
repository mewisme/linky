"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";

import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import { ChatSidebar } from "./chat-sidebar";
import { useChatPanelStore } from "@/features/chat/model/chat-panel-store";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";

export function ChatPanelHost() {
  const t = useTranslations("chat");
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const isChatPanelOpen = useChatPanelStore((s) => s.isChatPanelOpen);
  const closeChatPanel = useChatPanelStore((s) => s.closeChatPanel);
  const setChatPanelOpen = useChatPanelStore((s) => s.setChatPanelOpen);

  const chatMessages = useVideoChatStore((s) => s.chatMessages);
  const connectionStatus = useVideoChatStore((s) => s.connectionStatus);
  const isPeerTyping = useVideoChatStore((s) => s.isPeerTyping);
  const peerInfo = useVideoChatStore((s) => s.peerInfo);
  const peerInfoForTyping = peerInfo
    ? {
        avatarUrl: peerInfo.avatar_url,
        displayName:
          `${peerInfo.first_name ?? ""} ${peerInfo.last_name ?? ""}`.trim() ||
          t("peerFallback"),
      }
    : null;

  const { isInActiveCall, sendMessage, sendTyping } = useGlobalCallContext();

  useEffect(() => {
    if (!isInActiveCall && isChatPanelOpen) closeChatPanel();
  }, [isInActiveCall, isChatPanelOpen, closeChatPanel]);

  if (!isInActiveCall) return null;

  if (pathname !== "/call") return null;

  if (isMobile) return null;

  return (
    <ChatSidebar
      isOpen={isChatPanelOpen}
      onClose={() => setChatPanelOpen(false)}
      chatMessages={chatMessages}
      connectionStatus={connectionStatus}
      isPeerTyping={isPeerTyping}
      peerInfo={peerInfoForTyping}
      onSendMessage={sendMessage}
      onSendTyping={sendTyping}
    />
  );
}

