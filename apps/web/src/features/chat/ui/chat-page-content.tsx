"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ws/ui/components/ui/alert-dialog";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@ws/ui/components/ui/button";
import { ReactionEffectProvider } from "@/providers/realtime/reaction-effect-provider";
import { useChatPanelStore } from "@/features/chat/model/chat-panel-store";
import { useEffect } from "react";
import { useGlobalCallContext } from "@/providers/call/global-call-manager";
import { useUserContext } from "@/providers/user/user-provider";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";

export function ChatPageContent() {
  const { authLoading } = useUserContext();

  const error = useVideoChatStore((s) => s.error);
  const isFloatingMode = useVideoChatStore((s) => s.isFloatingMode);

  const { isInActiveCall, clearError } = useGlobalCallContext();

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
    <ReactionEffectProvider>
      <AlertDialog open={!!error && !authLoading} onOpenChange={(open) => !open && clearError()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Something went wrong</AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={clearError}>Dismiss</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              clearError();
              window.location.reload();
            }}>Refresh Page</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isFloatingMode && isInActiveCall && (
        <div className="flex h-[calc(100dvh-16rem)] w-full flex-col items-center justify-center gap-4">
          <p className="text-lg text-muted-foreground">Call is minimized</p>
          <Button onClick={handleRestoreFullUI} size="lg">
            Restore Full View
          </Button>
        </div>
      )}
    </ReactionEffectProvider>
  );
}
