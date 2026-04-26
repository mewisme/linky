"use client";

import * as Sentry from "@sentry/nextjs";

import { useCallback, useEffect } from "react";

import type {
  Notification,
  NotificationsResponse,
  UnreadCountResponse,
} from "@/entities/notification/types/notifications.types";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { trackEvent } from "@/lib/telemetry/events/client";
import { useNotificationsStore } from "@/features/notifications/model/notifications-store";
import { useSocket } from "@/features/realtime/hooks/use-socket";
import { useUserContext } from "@/providers/user/user-provider";

const PAGE_SIZE = 20;
let notificationsBootstrappedForUserId: string | null = null;
let notificationsInFlight: Promise<void> | null = null;

export function useNotifications() {
  const { authReady, user } = useUserContext();
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const isLoading = useNotificationsStore((s) => s.isLoading);
  const hasMore = useNotificationsStore((s) => s.hasMore);
  const { socket: chatSocket } = useSocket();

  const fetchNotifications = useCallback(async () => {
    Sentry.metrics.count("fetch_notifications", 1);
    useNotificationsStore.getState().setLoading(true);
    try {
      const params = {
        limit: String(PAGE_SIZE),
        offset: '0',
        unread_only: 'false',
      };
      const meQuery = new URLSearchParams(params).toString();
      const [notifData, countData] = await Promise.all([
        fetchFromActionRoute<NotificationsResponse>(`/api/notifications/me?${meQuery}`),
        fetchFromActionRoute<UnreadCountResponse>("/api/notifications/me/unread-count"),
      ]);

      useNotificationsStore.getState().setNotifications(notifData.notifications);
      useNotificationsStore.getState().setUnreadCount(countData.count);
      useNotificationsStore.getState().setHasMore(notifData.notifications.length >= PAGE_SIZE);
    } catch (error) {
      Sentry.metrics.count("fetch_notifications_failed", 1);
      Sentry.logger.error("Failed to fetch notifications", { error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      Sentry.metrics.count("fetch_notifications_completed", 1);
      useNotificationsStore.getState().setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const state = useNotificationsStore.getState();
    if (state.isLoading || !state.hasMore) return;

    state.setLoading(true);
    try {
      const params = {
        limit: String(PAGE_SIZE),
        offset: String(state.notifications.length),
        unread_only: 'false',
      };
      const meQuery = new URLSearchParams(params).toString();
      const data = await fetchFromActionRoute<NotificationsResponse>(
        `/api/notifications/me?${meQuery}`,
      );

      useNotificationsStore.getState().appendNotifications(data.notifications);
      useNotificationsStore.getState().setHasMore(data.notifications.length >= PAGE_SIZE);
    } catch (error) {
      Sentry.metrics.count("load_more_notifications_failed", 1);
      Sentry.logger.error("Failed to load more notifications", { error: error instanceof Error ? error.message : "Unknown error" });
      // silent
    } finally {
      Sentry.metrics.count("load_more_notifications_completed", 1);
      useNotificationsStore.getState().setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    useNotificationsStore.getState().markAsRead(id);
    try {
      await fetchFromActionRoute<void>(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
      });
    } catch (error) {
      Sentry.metrics.count("mark_notification_read_failed", 1);
      Sentry.logger.error("Failed to mark notification read", { error: error instanceof Error ? error.message : "Unknown error" });
      // silent - optimistic update already applied
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    useNotificationsStore.getState().markAllAsRead();
    try {
      await fetchFromActionRoute<void>("/api/notifications/read-all", { method: "PATCH" });
    } catch (error) {
      Sentry.metrics.count("mark_all_notifications_read_failed", 1);
      Sentry.logger.error("Failed to mark all notifications read", { error: error instanceof Error ? error.message : "Unknown error" });
      // silent - optimistic update already applied
    }
  }, []);

  useEffect(() => {
    if (!authReady) {
      notificationsBootstrappedForUserId = null;
      notificationsInFlight = null;
      return;
    }
    const userId = user.user?.id ?? "__signed-in__";
    if (notificationsBootstrappedForUserId === userId) return;
    if (notificationsInFlight) return;
    Sentry.metrics.count("fetch_notifications_started", 1);
    notificationsInFlight = fetchNotifications()
      .then(() => {
        notificationsBootstrappedForUserId = userId;
      })
      .finally(() => {
        notificationsInFlight = null;
      });
  }, [authReady, fetchNotifications, user.user?.id]);

  useEffect(() => {
    if (!chatSocket) return;

    const handleNewNotification = (notification: Notification) => {
      Sentry.metrics.count("notification_received", 1);
      useNotificationsStore.getState().addNotification(notification);
      trackEvent({ name: "notification_received", properties: { type: notification.type } });
    };

    const handleNotificationRead = (data: { notificationId: string }) => {
      Sentry.metrics.count("notification_read", 1);
      useNotificationsStore.getState().markAsRead(data.notificationId);
    };

    const handleAllRead = () => {
      Sentry.metrics.count("all_notifications_read", 1);
      useNotificationsStore.getState().markAllAsRead();
    };

    chatSocket.on("notification:new", handleNewNotification);
    chatSocket.on("notification:read", handleNotificationRead);
    chatSocket.on("notification:all-read", handleAllRead);

    return () => {
      Sentry.metrics.count("notification_unsubscribed", 1);
      chatSocket.off("notification:new", handleNewNotification);
      chatSocket.off("notification:read", handleNotificationRead);
      chatSocket.off("notification:all-read", handleAllRead);
    };
  }, [chatSocket]);

  return {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    fetchNotifications,
    loadMore,
    markAsRead,
    markAllAsRead,
  };
}
