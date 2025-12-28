"use client";

import {
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  SkipForward,
  Video,
  VideoOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";

import { Button } from "@repo/ui/components/ui/button";
import type { ConnectionStatus } from "@/hooks/use-video-chat";
import { useIsMobile } from "@repo/ui/hooks/use-mobile";

interface VideoControlsProps {
  connectionStatus: ConnectionStatus;
  isMuted: boolean;
  isVideoOff: boolean;
  hasLocalStream: boolean;
  isChatOpen: boolean;
  hasUnreadMessages: boolean;
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
  onStart,
  onSkip,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleChat,
}: VideoControlsProps) {
  const isMobile = useIsMobile();

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
    </div>
  );
}

