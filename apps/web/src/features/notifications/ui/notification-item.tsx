"use client";

import type { Notification, NotificationType } from "@/entities/notification/types/notifications.types";

import { NotificationIcon } from "./notification-icon";
import { trackEvent } from "@/lib/telemetry/events/client";
import { useTranslations } from "next-intl";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const t = useTranslations("notifications");
  const payload = notification.payload as Record<string, unknown>;

  let title: string;
  switch (notification.type) {
    case "favorite_added":
      title = t("titleFavoriteAdded");
      break;
    case "level_up":
      title = t("titleLevelUp");
      break;
    case "streak_milestone":
      title = t("titleStreakMilestone");
      break;
    case "streak_expiring":
      title = t("titleStreakExpiring");
      break;
    case "admin_broadcast":
      title = t("titleAnnouncement");
      break;
    default:
      title = t("titleDefault");
  }

  let description: string;
  switch (notification.type) {
    case "favorite_added":
      description = t("favoriteAddedBody", {
        name: (payload.from_user_name as string) || t("someone"),
      });
      break;
    case "level_up":
      description = t("levelUpBody", { level: (payload.level as number) || "" });
      break;
    case "streak_milestone":
      description = t("streakMilestoneBody", { days: (payload.days as number) || "" });
      break;
    case "streak_expiring":
      description = t("streakExpiringSoon");
      break;
    case "admin_broadcast":
      description = (payload.message as string) || t("newAnnouncement");
      break;
    default:
      description = t("newNotification");
  }

  const date = new Date(notification.created_at);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let timeAgo: string;
  if (days > 0) timeAgo = t("relativeDaysAgo", { count: days });
  else if (hours > 0) timeAgo = t("relativeHoursAgo", { count: hours });
  else if (minutes > 0) timeAgo = t("relativeMinutesAgo", { count: minutes });
  else timeAgo = t("relativeJustNow");

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
