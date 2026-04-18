"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

import { Button } from "@ws/ui/components/ui/button";
import { useChatPanelStore } from "@/features/chat/model/chat-panel-store";
import { useEffect } from "react";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { useTranslations } from "next-intl";

export function ChatPageContent() {
  const t = useTranslations("chat");
  const isFloatingMode = useVideoChatStore((s) => s.isFloatingMode);

  const { isInActiveCall } = useGlobalCallContext();

  const openChatPanel = useChatPanelStore((s) => s.openChatPanel);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const shouldOpen = searchParams.get("open_chat_panel") === "true";
    if (!shouldOpen) {
      return;
    }

    openChatPanel();

    const params = new URLSearchParams(searchParams.toString());
    params.delete("open_chat_panel");
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl);
  }, [openChatPanel, pathname, router, searchParams]);

  const handleRestoreFullUI = () => {
    useVideoChatStore.getState().setFloatingMode(false);
  };

  return (
    <>
      {isFloatingMode && isInActiveCall && (
        <div className="flex h-[calc(100dvh-16rem)] w-full flex-col items-center justify-center gap-4">
          <p className="text-lg text-muted-foreground">{t("callMinimized")}</p>
          <Button onClick={handleRestoreFullUI} size="lg">
            {t("restoreFullView")}
          </Button>
        </div>
      )}
    </>
  );
}
