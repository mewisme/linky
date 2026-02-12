"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import { IconFlame, IconPlayerPlay, IconStar } from "@tabler/icons-react";

import { Button } from "@ws/ui/components/ui/button";
import type { UsersAPI } from "@/types/users.types";
import { useUserContext } from "@/components/providers/user/user-provider";

interface VideoChatIdleStateProps {
  onStart: () => void;
  progress?: UsersAPI.Progress.GetMe.Response | null;
}

export function VideoChatIdleState({ onStart, progress }: VideoChatIdleStateProps) {
  const { user } = useUserContext();

  const displayName =
    user.user?.firstName || user.user?.username || "You";

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center pb-24 pt-8"
      data-reaction-exclude
      data-testid="chat-idle-container"
    >
      <div
        className="animate-in fade-in-0 zoom-in-95 flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-6 shadow-lg duration-500 sm:px-8 sm:py-7 dark:border-white/10 dark:bg-black/40 dark:shadow-xl dark:backdrop-blur-md"
        style={{ animationFillMode: "backwards" }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <Avatar className="h-14 w-14 rounded-full border-2 border-border/60 ring-2 ring-border/30 sm:h-16 sm:w-16 dark:border-white/15 dark:ring-white/5">
            <AvatarImage
              src={user.user?.imageUrl ?? undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-muted text-base font-medium text-muted-foreground">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">
            Ready to start a chat?
          </h2>
        </div>

        {progress && (
          <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <IconStar className="size-3.5 shrink-0" />
              Level {progress.currentLevel}
            </span>
            <span className="tabular-nums">
              {progress.expProgress.progressPercentage.toFixed(0)}% to next
            </span>
            {progress.streak.currentStreak > 0 && (
              <span className="inline-flex items-center gap-1">
                <IconFlame className="size-3.5 shrink-0 text-orange-500" />
                {progress.streak.currentStreak} day
                {progress.streak.currentStreak !== 1 ? "s" : ""} streak
              </span>
            )}
          </div>
        )}

        <Button
          size="lg"
          onClick={onStart}
          className="h-12 w-full gap-2 rounded-xl px-6 text-base font-semibold shadow-lg sm:h-14 sm:px-8"
          data-testid="chat-start-button"
        >
          <IconPlayerPlay className="size-5" />
          Start Chat
        </Button>

        <p className="text-xs text-muted-foreground">
          You earn EXP by talking
        </p>
      </div>
    </div>
  );
}
