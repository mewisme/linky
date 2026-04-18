"use client";

import { Button } from "@ws/ui/components/ui/button";
import { IconBellOff } from "@tabler/icons-react";
import type { Notification } from "@/entities/notification/types/notifications.types";
import { NotificationItem } from "./notification-item";
import { ScrollArea } from "@ws/ui/components/ui/scroll-area";
import { useTranslations } from "next-intl";

interface NotificationsPanelProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onLoadMore: () => void;
}

export function NotificationsPanel({
  notifications,
  unreadCount,
  isLoading,
  hasMore,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
}: NotificationsPanelProps) {
  const t = useTranslations("notifications");
  return (
    <div
      className="flex flex-col w-full"
      data-testid="notifications-panel"
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">{t("panelTitle")}</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllAsRead}
            className="text-xs h-7"
            data-testid="mark-all-read-button"
          >
            {t("markAllRead")}
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-[350px]">
        {notifications.length === 0 && !isLoading && (
          <div
            className="flex flex-col items-center justify-center py-12 text-center px-4"
            data-testid="notifications-empty"
          >
            <IconBellOff className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("emptyState")}
            </p>
          </div>
        )}

        <div className="divide-y">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
            />
          ))}
        </div>

        {hasMore && notifications.length > 0 && (
          <div className="p-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoading}
              data-testid="load-more-notifications"
            >
              {isLoading ? t("panelLoading") : t("panelLoadMore")}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
