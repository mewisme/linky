"use client";

import * as Sentry from "@sentry/nextjs";

import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ws/ui/components/ui/dialog";
import {
  IconMessageCircle,
  IconMicrophone,
  IconMicrophoneOff,
  IconPhoneOff,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconUser,
  IconVideo,
  IconVideoOff,
  IconFlag,
  IconStar,
  IconPictureInPicture,
  IconScreenShare,
  IconScreenShareOff,
  IconBan,
} from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ws/ui/components/ui/tooltip";
import { MoreOptionsMenu } from "./more-options-menu";
import { MoreOptionsDrawer } from "./more-options-drawer";

import { Badge } from "@ws/ui/components/ui/badge";
import { Button } from "@ws/ui/components/ui/button";
import { Textarea } from "@ws/ui/components/ui/textarea";
import { Label } from "@ws/ui/components/ui/label";
import { toast } from "@ws/ui/components/ui/sonner";
import type { ConnectionStatus } from "@/features/call/hooks/webrtc/use-video-chat";
import type { UsersAPI } from "@/entities/user/types/users.types";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import React, { useState, useMemo, useEffect, type ReactNode, Activity } from "react";

import { trackEvent } from "@/lib/telemetry/events/client";
import { useUserContext } from "@/providers/user/user-provider";
import { useVideoChatStore } from "@/features/call/model/video-chat-store";
import { getFavorites, addFavorite, removeFavorite } from "@/actions/resources/favorites";
import { createReport } from "@/actions/resources/reports";

type ControlPriority = "primary" | "secondary" | "overflow";

export interface ControlConfig {
  id: string;
  priority: ControlPriority;
  icon: React.ElementType;
  label: string;
  variant?: "default" | "destructive" | "outline";
  onClick: () => void;
  disabled?: boolean | ((props: ControlContext) => boolean);
  visible?: boolean | ((props: ControlContext) => boolean);
  badge?: ReactNode;
  dynamicIcon?: (props: ControlContext) => React.ElementType;
  dynamicLabel?: (props: ControlContext) => string;
  dynamicVariant?: (props: ControlContext) => "default" | "destructive" | "outline";
  testId?: string | ((props: ControlContext) => string);
}

export interface ControlContext {
  connectionStatus: ConnectionStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  hasLocalStream: boolean;
  isChatOpen: boolean;
  hasUnreadMessages: boolean;
  peerInfo: UsersAPI.PublicUserInfo | null;
  isFavoriteAdded: boolean;
}

interface VideoControlsProps {
  connectionStatus: ConnectionStatus;
  isInActiveCall: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  hasLocalStream: boolean;
  isChatOpen: boolean;
  hasUnreadMessages: boolean;
  peerInfo: UsersAPI.PublicUserInfo | null;
  onStart: () => void;
  onSkip: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleChat: () => void;
  onToggleScreenShare?: () => void;
  isSharingScreen?: boolean;
  onBlockUser?: (userId: string) => void;
  sendFavoriteNotification: (action: "added" | "removed", peerUserId: string, userName: string) => void;
  initialFavorites?: ResourcesAPI.Favorites.Get.Response | null;
}

interface ControlButtonProps {
  config: ControlConfig;
  context: ControlContext;
  onPeerInfoOpen: () => void;
  onReportOpen: () => void;
}

function ControlButton({ config, context, onPeerInfoOpen, onReportOpen }: ControlButtonProps) {
  const isVisible =
    config.visible === undefined
      ? true
      : typeof config.visible === "boolean"
        ? config.visible
        : config.visible(context);

  if (!isVisible) {
    return null;
  }

  const isDisabled =
    typeof config.disabled === "boolean"
      ? config.disabled
      : config.disabled?.(context) ?? false;

  const Icon = config.dynamicIcon?.(context) ?? config.icon;
  const label = config.dynamicLabel?.(context) ?? config.label;
  const variant =
    config.dynamicVariant?.(context) ?? config.variant ?? "outline";
  const testId = typeof config.testId === "function" ? config.testId(context) : config.testId;

  const handleClick = () => {
    if (config.id === "peer-info") {
      onPeerInfoOpen();
    } else if (config.id === "report") {
      onReportOpen();
    } else {
      config.onClick();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleClick}
          disabled={isDisabled}
          variant={variant}
          size="icon"
          className={`h-12 w-12 ${config.badge ? "relative" : ""}`}
          data-testid={testId}
        >
          <Icon className="size-5" />
          {config.badge}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function VideoControls({
  connectionStatus,
  isInActiveCall,
  isMuted,
  isVideoOff,
  hasLocalStream,
  isChatOpen,
  hasUnreadMessages,
  peerInfo,
  onStart,
  onSkip,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleChat,
  onToggleScreenShare,
  isSharingScreen = false,
  onBlockUser,
  sendFavoriteNotification,
  initialFavorites,
}: VideoControlsProps) {
  const isMobile = useIsMobile();
  const { user } = useUserContext();
  const [isPeerInfoOpen, setIsPeerInfoOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const isFloatingMode = useVideoChatStore((s) => s.isFloatingMode);

  useEffect(() => {
    if (!peerInfo?.id) {
      setIsFavorite(false);
      return;
    }

    if (initialFavorites?.data) {
      const isFavorited = initialFavorites.data.some(
        (fav) => fav.favorite_user_id === peerInfo.id
      );
      setIsFavorite(isFavorited);
      return;
    }

    let mounted = true;

    const checkIfFavorited = async () => {
      if (!mounted) return;

      try {
        const data = await getFavorites();

        if (!mounted) return;

        const favorites = data.data || [];
        const isFavorited = favorites.some(
          (fav: { favorite_user_id: string }) => fav.favorite_user_id === peerInfo.id
        );

        if (mounted) {
          setIsFavorite(isFavorited);
        }
      } catch (error) {
        Sentry.metrics.count("failed_to_check_favorite_status", 1);
        Sentry.logger.error("Failed to check favorite status", { error: error instanceof Error ? error.message : "Unknown error" });
      }
    };

    checkIfFavorited();

    return () => {
      mounted = false;
    };
  }, [peerInfo?.id, initialFavorites?.data]);

  const handleToggleFavorite = async () => {
    if (!peerInfo?.id || isFavoriteLoading) {
      return;
    }

    setIsFavoriteLoading(true);
    const isAdding = !isFavorite;

    try {
      if (isAdding) {
        await addFavorite(peerInfo.id);

        setIsFavorite(true);
        trackEvent({ name: "favorite_added" });
        toast.success("Added to favorites ❤️");

        const userName = user.user?.fullName || user.user?.firstName || "Someone";
        sendFavoriteNotification("added", peerInfo.id, userName || "Someone");
      } else {
        await removeFavorite(peerInfo.id);

        setIsFavorite(false);
        trackEvent({ name: "favorite_removed" });
        toast.success("Removed from favorites");

        const userName = user.user?.fullName || user.user?.firstName || "Someone";
        sendFavoriteNotification("removed", peerInfo.id, userName || "Someone");
      }
    } catch (error) {
      Sentry.metrics.count("failed_to_toggle_favorite", 1);
      Sentry.logger.error("Failed to toggle favorite", { error: error instanceof Error ? error.message : "Unknown error" });
      toast.error(error instanceof Error ? error.message : "Failed to update favorite");
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const context: ControlContext = {
    connectionStatus,
    isMuted,
    isVideoOff,
    hasLocalStream,
    isChatOpen,
    hasUnreadMessages,
    peerInfo,
    isFavoriteAdded: isFavorite,
  };

  const controls: ControlConfig[] = useMemo(
    () => [
      {
        id: "start",
        priority: "primary",
        icon: IconPlayerPlay,
        label: "Start",
        variant: "default",
        onClick: onStart,
        visible: connectionStatus === "idle" || connectionStatus === "ended",
      },
      {
        id: "mute",
        priority: "primary",
        icon: IconMicrophone,
        label: "Mute",
        onClick: onToggleMute,
        disabled: !hasLocalStream,
        dynamicIcon: (ctx) => (ctx.isMuted ? IconMicrophoneOff : IconMicrophone),
        dynamicLabel: (ctx) => (ctx.isMuted ? "Unmute" : "Mute"),
        dynamicVariant: (ctx) => (ctx.isMuted ? "destructive" : "outline"),
        testId: "chat-mute-button",
      },
      {
        id: "skip",
        priority: "primary",
        icon: IconPlayerSkipForward,
        label: "Skip",
        variant: "outline",
        onClick: onSkip,
        visible: isInActiveCall,
        disabled: !isInActiveCall && connectionStatus !== "searching",
        testId: "chat-skip-button",
      },
      {
        id: "video",
        priority: "primary",
        icon: IconVideo,
        label: "Camera Off",
        onClick: onToggleVideo,
        disabled: !hasLocalStream,
        dynamicIcon: (ctx) => (ctx.isVideoOff ? IconVideoOff : IconVideo),
        dynamicLabel: (ctx) => (ctx.isVideoOff ? "Camera On" : "Camera Off"),
        dynamicVariant: (ctx) => (ctx.isVideoOff ? "destructive" : "outline"),
        testId: "chat-video-toggle-button",
      },
      {
        id: "end-call",
        priority: "primary",
        icon: IconPhoneOff,
        label: "End Call",
        variant: "destructive",
        onClick: onEndCall,
        visible:
          connectionStatus === "in_call" ||
          connectionStatus === "reconnecting" ||
          connectionStatus === "searching" ||
          connectionStatus === "matched" ||
          hasLocalStream,
        testId: (ctx) => ctx.connectionStatus === "searching"
          ? "chat-cancel-search-button"
          : "chat-end-call-button",
      },
      {
        id: "chat",
        priority: "overflow",
        icon: IconMessageCircle,
        label: "Show Chat",
        variant: "outline",
        onClick: onToggleChat,
        dynamicLabel: (ctx) => (ctx.isChatOpen ? "Hide Chat" : "Show Chat"),
        testId: "chat-toggle-button",
      },
      {
        id: "peer-info",
        priority: "overflow",
        icon: IconUser,
        label: "Peer Info",
        variant: "outline",
        onClick: () => { },
        visible: isInActiveCall && !!peerInfo,
      },
      {
        id: "favorite",
        priority: "overflow",
        icon: IconStar,
        label: "Add to Favorites",
        variant: "outline",
        onClick: handleToggleFavorite,
        visible: isInActiveCall && !!peerInfo,
        disabled: isFavoriteLoading,
        dynamicLabel: (ctx) => ctx.isFavoriteAdded ? "Remove from Favorites" : "Add to Favorites",
        testId: (ctx) => ctx.isFavoriteAdded ? "chat-remove-favorite-button" : "chat-add-favorite-button",
      },
      {
        id: "report",
        priority: "overflow",
        icon: IconFlag,
        label: "Report",
        variant: "outline",
        onClick: () => { },
        visible: isInActiveCall && !!peerInfo,
      },
      {
        id: "screen-share",
        priority: "overflow",
        icon: IconScreenShare,
        label: "Share Screen",
        variant: "outline",
        onClick: () => onToggleScreenShare?.(),
        visible: isInActiveCall && !isMobile && !!onToggleScreenShare,
        disabled: !isInActiveCall,
        dynamicIcon: () => (isSharingScreen ? IconScreenShareOff : IconScreenShare),
        dynamicLabel: () => (isSharingScreen ? "Stop Sharing" : "Share Screen"),
        dynamicVariant: () => (isSharingScreen ? "destructive" : "outline"),
        testId: "chat-screen-share-button",
      },
      {
        id: "picture-in-picture",
        priority: "overflow",
        icon: IconPictureInPicture,
        label: "Picture in Picture",
        variant: "outline",
        onClick: () => {
          useVideoChatStore.getState().setFloatingMode(!isFloatingMode);
        },
        visible: isInActiveCall,
        dynamicLabel: () => isFloatingMode ? "Exit Picture in Picture" : "Picture in Picture",
        testId: "chat-pip-toggle-button",
      },
      {
        id: "block-user",
        priority: "overflow",
        icon: IconBan,
        label: "Block User",
        variant: "outline",
        onClick: () => {
          if (peerInfo?.id && onBlockUser) {
            onBlockUser(peerInfo.id);
          }
        },
        visible: isInActiveCall && !!peerInfo && !!onBlockUser,
        testId: "chat-block-user-button",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      connectionStatus,
      isInActiveCall,
      hasLocalStream,
      onEndCall,
      onSkip,
      onStart,
      onToggleChat,
      onToggleMute,
      onToggleVideo,
      onToggleScreenShare,
      isSharingScreen,
      onBlockUser,
      peerInfo,
      handleToggleFavorite,
      isFavorite,
      isFavoriteLoading,
      isFloatingMode,
      isMobile,
    ]
  );

  const primaryControls = controls.filter((c) => c.priority === "primary");
  const overflowControls = controls.filter((c) => c.priority === "overflow");

  const visibleOverflowControls = overflowControls.filter((c) => {
    const isVisible =
      c.visible === undefined
        ? true
        : typeof c.visible === "boolean"
          ? c.visible
          : c.visible(context);
    return isVisible;
  });

  const showOverflowMenu = visibleOverflowControls.length > 0;
  const hasUnreadMessagesIndicator = hasUnreadMessages && !isChatOpen;

  return (
    <div
      className={`left-1/2 flex -translate-x-1/2 gap-2 ${isMobile
        ? "fixed bottom-4"
        : "absolute bottom-4"
        }`}
      style={
        isMobile
          ? {
            bottom: `calc(1rem + env(safe-area-inset-bottom, 0px))`,
          }
          : undefined
      }
    >
      <TooltipProvider>
        {primaryControls.map((control) => (
          <ControlButton
            key={control.id}
            config={control}
            context={context}
            onPeerInfoOpen={() => setIsPeerInfoOpen(true)}
            onReportOpen={() => setIsReportOpen(true)}
          />
        ))}

        {showOverflowMenu &&
          (isMobile ? (
            <MoreOptionsDrawer
              controls={visibleOverflowControls}
              context={context}
              hasUnreadIndicator={hasUnreadMessagesIndicator}
              onPeerInfoOpen={() => setIsPeerInfoOpen(true)}
              onReportOpen={() => setIsReportOpen(true)}
            />
          ) : (
            <MoreOptionsMenu
              controls={visibleOverflowControls}
              context={context}
              hasUnreadIndicator={hasUnreadMessagesIndicator}
              onPeerInfoOpen={() => setIsPeerInfoOpen(true)}
              onReportOpen={() => setIsReportOpen(true)}
            />
          ))}
      </TooltipProvider>

      <Dialog open={isPeerInfoOpen} onOpenChange={setIsPeerInfoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Peer Information</DialogTitle>
            <DialogDescription>
              Information about the person you are connected with
            </DialogDescription>
          </DialogHeader>
          {peerInfo && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={peerInfo.avatar_url || undefined} alt={`${peerInfo.first_name || ""} ${peerInfo.last_name || ""}`.trim()} />
                  <AvatarFallback>
                    {peerInfo.first_name?.[0] || ""}
                    {peerInfo.last_name?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {peerInfo.first_name || ""} {peerInfo.last_name || ""}
                  </h3>
                  {peerInfo.gender && (
                    <p className="text-sm text-muted-foreground capitalize">
                      {peerInfo.gender}
                    </p>
                  )}
                  {peerInfo.date_of_birth && (
                    <p className="text-sm text-muted-foreground">
                      Born: {new Date(peerInfo.date_of_birth).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {peerInfo.bio && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{peerInfo.bio}</p>
                </div>
              )}

              {peerInfo.interest_tags && peerInfo.interest_tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {peerInfo.interest_tags.map((tag) => (
                      <Badge key={tag.id} variant="secondary">
                        <Activity mode={tag.icon ? 'visible' : 'hidden'}>
                          <span className="mr-1">{tag.icon}</span>
                        </Activity>
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
            <DialogDescription>
              Please provide a reason for reporting this user. Our team will review your report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {peerInfo && (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={peerInfo.avatar_url || undefined} alt={`${peerInfo.first_name || ""} ${peerInfo.last_name || ""}`.trim()} />
                  <AvatarFallback>
                    {peerInfo.first_name?.[0] || ""}
                    {peerInfo.last_name?.[0] || ""}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {peerInfo.first_name || ""} {peerInfo.last_name || ""}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason</Label>
              <Textarea
                id="report-reason"
                placeholder="Please describe the issue..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsReportOpen(false);
                  setReportReason("");
                }}
                disabled={isSubmittingReport}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!reportReason.trim() || !peerInfo) {
                    toast.error("Please provide a reason for the report");
                    return;
                  }

                  setIsSubmittingReport(true);
                  try {
                    await createReport({
                      reported_user_id: peerInfo.id,
                      reason: reportReason.trim(),
                    });

                    trackEvent({ name: "report_submitted" });
                    toast.success("Report submitted successfully");
                    setIsReportOpen(false);
                    setReportReason("");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to submit report");
                  } finally {
                    setIsSubmittingReport(false);
                  }
                }}
                disabled={isSubmittingReport || !reportReason.trim()}
              >
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

