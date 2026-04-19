"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
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

import { VIDEO_CHAT_NO_MICROPHONE_ERROR_MESSAGE } from "@/features/call/lib/webrtc/video-chat-media-errors";
import { useVideoChat } from "@/features/call/hooks/webrtc/use-video-chat";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import type { ChatMessageDraft } from "@/features/chat/types/chat-message.types";
import { useTranslations } from "next-intl";
import { useLocaleChangeGuardStore } from "@/shared/model/locale-change-guard-store";

interface GlobalCallContextValue {
  isInActiveCall: boolean;

  sendMessage: (draft: ChatMessageDraft) => void;
  sendTyping: (isTyping: boolean) => void;
  start: () => Promise<void>;
  skip: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  swapCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  isSharingScreen: boolean;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  clearError: () => void;
  isPassive: boolean;
}

const GlobalCallContext = createContext<GlobalCallContextValue | null>(null);

interface GlobalCallManagerProps {
  children: ReactNode;
}

function LocaleChangeGuardDialog({ endCall }: { endCall: () => void }) {
  const t = useTranslations("common.localeChangeGuard");
  const dialogOpen = useLocaleChangeGuardStore((s) => s.dialogOpen);
  const closeDialog = useLocaleChangeGuardStore((s) => s.closeDialog);
  const takePendingRun = useLocaleChangeGuardStore((s) => s.takePendingRun);

  return (
    <AlertDialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const run = takePendingRun();
              endCall();
              void Promise.resolve(run?.());
            }}
          >
            {t("endCallConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function GlobalCallManager({ children }: GlobalCallManagerProps) {
  const t = useTranslations("call.globalError");
  const tCommon = useTranslations("common");
  const videoChat = useVideoChat();
  const error = useVideoChatStore((s) => s.error);
  const isNoMicrophoneError = error === VIDEO_CHAT_NO_MICROPHONE_ERROR_MESSAGE;

  const contextValue = useMemo<GlobalCallContextValue>(() => ({
    isInActiveCall: videoChat.isInActiveCall,
    sendMessage: videoChat.sendMessage,
    sendTyping: videoChat.sendTyping,
    start: videoChat.start,
    skip: videoChat.skip,
    endCall: videoChat.endCall,
    toggleMute: videoChat.toggleMute,
    toggleVideo: videoChat.toggleVideo,
    swapCamera: videoChat.swapCamera,
    toggleScreenShare: videoChat.toggleScreenShare,
    isSharingScreen: videoChat.isSharingScreen,
    sendFavoriteNotification: videoChat.sendFavoriteNotification,
    clearError: videoChat.clearError,
    isPassive: videoChat.isPassive,
  }), [
    videoChat.isInActiveCall,
    videoChat.sendMessage,
    videoChat.sendTyping,
    videoChat.start,
    videoChat.skip,
    videoChat.endCall,
    videoChat.toggleMute,
    videoChat.toggleVideo,
    videoChat.swapCamera,
    videoChat.toggleScreenShare,
    videoChat.isSharingScreen,
    videoChat.sendFavoriteNotification,
    videoChat.clearError,
    videoChat.isPassive,
  ]);

  return (
    <GlobalCallContext.Provider value={contextValue}>
      <LocaleChangeGuardDialog endCall={videoChat.endCall} />
      <AlertDialog
        open={!!error}
        onOpenChange={(open) => {
          if (!open) {
            videoChat.clearError();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isNoMicrophoneError ? t("noMicrophoneTitle") : t("genericTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>{error}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {isNoMicrophoneError ? (
              <AlertDialogAction onClick={videoChat.clearError}>{tCommon("ok")}</AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel onClick={videoChat.clearError}>{t("dismiss")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    videoChat.clearError();
                    window.location.reload();
                  }}
                >
                  {t("refreshPage")}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {children}
    </GlobalCallContext.Provider>
  );
}

export function useGlobalCallContext(): GlobalCallContextValue {
  const context = useContext(GlobalCallContext);
  if (!context) {
    throw new Error("useGlobalCallContext must be used within GlobalCallManager");
  }
  return context;
}
