"use client";

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@ws/ui/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ws/ui/components/ui/popover";

import { Badge } from "@ws/ui/components/ui/badge";
import { Button } from "@ws/ui/components/ui/button";
import { IconBell } from "@tabler/icons-react";
import { NotificationsPanel } from "@/features/notifications/ui/notifications-panel";
import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import { useNotifications } from "@/features/notifications/hooks/use-notifications";

export function NotificationsBell() {
  const isMobile = useIsMobile();
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
  } = useNotifications();

  const trigger = (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      aria-label="Notifications"
      data-testid="notifications-bell"
    >
      <IconBell className="size-4" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center rounded-full px-1 text-[10px]"
          data-testid="notifications-unread-count"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Button>
  );

  const panelContent = (
    <NotificationsPanel
      notifications={notifications}
      unreadCount={unreadCount}
      isLoading={isLoading}
      hasMore={hasMore}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      onLoadMore={loadMore}
    />
  );

  if (isMobile) {
    return (
      <Drawer >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="z-150!">
          <div className="max-h-[70vh] overflow-hidden">{panelContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-[380px] p-0 z-150!"
        align="end"
        sideOffset={8}
      >
        {panelContent}
      </PopoverContent>
    </Popover>
  );
}
