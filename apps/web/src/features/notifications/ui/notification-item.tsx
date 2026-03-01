"use client";

import type { Notification, NotificationType } from "@/entities/notification/types/notifications.types";

import { NotificationIcon } from "./notification-icon";
import { trackEvent } from "@/lib/telemetry/events/client";

const titleMap: Record<NotificationType, string> = {
  favorite_added: "New Favorite",
  level_up: "Level Up",
  streak_milestone: "Streak Milestone",
  streak_expiring: "Streak Expiring",
  admin_broadcast: "Announcement",
};

function getNotificationDescription(notification: Notification): string {
  const payload = notification.payload as Record<string, unknown>;

  switch (notification.type) {
    case "favorite_added":
      return `${(payload.from_user_name as string) || "Someone"} added you to favorites`;
    case "level_up":
      return `You reached level ${(payload.level as number) || ""}`;
    case "streak_milestone":
      return `${(payload.days as number) || ""} day streak achieved`;
    case "streak_expiring":
      return "Your streak is about to expire";
    case "admin_broadcast":
      return (payload.message as string) || "New announcement";
    default:
      return "New notification";
  }
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const title = titleMap[notification.type] || "Notification";
  const description = getNotificationDescription(notification);
  const timeAgo = getRelativeTime(notification.created_at);

  return (
    <button
      onClick={() => {
        if (!notification.is_read) {
          onMarkAsRead(notification.id);
          trackEvent({ name: "notification_clicked", properties: { type: notification.type } });
        }
      }}
      className={`flex w-full items-start gap-3 rounded p-3 text-left transition-colors hover:bg-accent ${notification.is_read ? "opacity-60" : ""
        }`}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="mt-0.5 shrink-0">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{title}</p>
          {!notification.is_read && (
            <span className="shrink-0 h-2 w-2 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {description}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </button>
  );
}
