"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import {
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  SkipForward,
  User,
  Video,
  VideoOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";

import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import type { ConnectionStatus } from "@/hooks/use-video-chat";
import type { UsersAPI } from "@/types/users.types";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { useState } from "react";

interface VideoControlsProps {
  connectionStatus: ConnectionStatus;
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
}

export function VideoControls({
  connectionStatus,
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
}: VideoControlsProps) {
  const isMobile = useIsMobile();
  const [isPeerInfoOpen, setIsPeerInfoOpen] = useState(false);

  return (
    <div
      className={`left-1/2 flex -translate-x-1/2 gap-2 ${isMobile
        ? "fixed bottom-4 z-50"
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
        <Tooltip>
          <TooltipTrigger asChild>
            {connectionStatus === "idle" && (
              <Button
                onClick={onStart}
                variant="default"
                size="icon"
                className="h-12 w-12"
              >
                <Play className="size-5" />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>Start</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            {connectionStatus === "connected" && (
              <Button
                onClick={onSkip}
                disabled={
                  connectionStatus !== "connected" &&
                  connectionStatus !== "searching"
                }
                variant="outline"
                size="icon"
                className="h-12 w-12"
              >
                <SkipForward className="size-5" />
              </Button>
            )}
          </TooltipTrigger>
          <TooltipContent>
            <p>Skip</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleMute}
              disabled={!hasLocalStream}
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              className="h-12 w-12"
            >
              {isMuted ? (
                <MicOff className="size-5" />
              ) : (
                <Mic className="size-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isMuted ? "Unmute" : "Mute"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleVideo}
              disabled={!hasLocalStream}
              variant={isVideoOff ? "destructive" : "outline"}
              size="icon"
              className="h-12 w-12"
            >
              {isVideoOff ? (
                <VideoOff className="size-5" />
              ) : (
                <Video className="size-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isVideoOff ? "Camera On" : "Camera Off"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onToggleChat}
              variant="outline"
              size="icon"
              className="relative h-12 w-12"
            >
              <MessageSquare className="size-5" />
              {hasUnreadMessages && !isChatOpen && (
                <span className="absolute right-1 top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isChatOpen ? "Hide Chat" : "Show Chat"}</p>
          </TooltipContent>
        </Tooltip>

        {connectionStatus === "connected" && peerInfo && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsPeerInfoOpen(true)}
                variant="outline"
                size="icon"
                className="h-12 w-12"
              >
                <User className="size-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Peer Info</p>
            </TooltipContent>
          </Tooltip>
        )}

        {(connectionStatus === "connected" ||
          connectionStatus === "searching" ||
          connectionStatus === "connecting" ||
          hasLocalStream) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onEndCall}
                  variant="destructive"
                  size="icon"
                  className="h-12 w-12"
                >
                  <PhoneOff className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>End Call</p>
              </TooltipContent>
            </Tooltip>
          )}
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
                        {tag.icon && <span className="mr-1">{tag.icon}</span>}
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
    </div>
  );
}

