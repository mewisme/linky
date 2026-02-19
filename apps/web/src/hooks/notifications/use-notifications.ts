"use client";

import {
  getNotifications as getNotificationsAPI,
  getUnreadCount as getUnreadCountAPI,
  markAllNotificationsRead as markAllNotificationsReadAPI,
  markNotificationRead as markNotificationReadAPI,
} from "@/lib/api/notifications";
import { useCallback, useEffect, useRef } from "react";

import type { Notification } from "@/types/notifications.types";
import { trackEvent } from "@/lib/analytics/events/client";
import { useNotificationsStore } from "@/stores/notifications-store";
import { useSocket } from "@/hooks/socket/use-socket";
import { useUserContext } from "@/components/providers/user/user-provider";

const PAGE_SIZE = 20;

export function useNotifications() {
  const { state: { getToken }, authReady } = useUserContext();
  const notifications = useNotificationsStore((s) => s.notifications);
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const isLoading = useNotificationsStore((s) => s.isLoading);
  const hasMore = useNotificationsStore((s) => s.hasMore);
  const { socket: chatSocket } = useSocket();
  const fetchedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    useNotificationsStore.getState().setLoading(true);
    try {
      const [notifData, countData] = await Promise.all([
        getNotificationsAPI(token, { limit: PAGE_SIZE, offset: 0 }),
        getUnreadCountAPI(token),
      ]);

      useNotificationsStore.getState().setNotifications(notifData.notifications);
      useNotificationsStore.getState().setUnreadCount(countData.count);
      useNotificationsStore.getState().setHasMore(notifData.notifications.length >= PAGE_SIZE);
    } catch {
      // silent
    } finally {
      useNotificationsStore.getState().setLoading(false);
    }
  }, [getToken]);

  const loadMore = useCallback(async () => {
    const token = await getToken();
    const state = useNotificationsStore.getState();
    if (!token || state.isLoading || !state.hasMore) return;

    state.setLoading(true);
    try {
      const data = await getNotificationsAPI(token, {
        limit: PAGE_SIZE,
        offset: state.notifications.length,
      });

      useNotificationsStore.getState().appendNotifications(data.notifications);
      useNotificationsStore.getState().setHasMore(data.notifications.length >= PAGE_SIZE);
    } catch {
      // silent
    } finally {
      useNotificationsStore.getState().setLoading(false);
    }
  }, [getToken]);

  const markAsRead = useCallback(
    async (id: string) => {
      const token = await getToken();
      if (!token) return;

      useNotificationsStore.getState().markAsRead(id);
      try {
        await markNotificationReadAPI(id, token);
      } catch {
        // silent - optimistic update already applied
      }
    },
    [getToken]
  );

  const markAllAsRead = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    useNotificationsStore.getState().markAllAsRead();
    try {
      await markAllNotificationsReadAPI(token);
    } catch {
      // silent - optimistic update already applied
    }
  }, [getToken]);

  useEffect(() => {
    if (authReady && !fetchedRef.current) {
      fetchedRef.current = true;
      void fetchNotifications();
    }
  }, [authReady, fetchNotifications]);

  useEffect(() => {
    if (!chatSocket) return;

    const handleNewNotification = (notification: Notification) => {
      useNotificationsStore.getState().addNotification(notification);
      trackEvent({ name: "notification_received", properties: { type: notification.type } });
    };

    const handleNotificationRead = (data: { notificationId: string }) => {
      useNotificationsStore.getState().markAsRead(data.notificationId);
    };

    const handleAllRead = () => {
      useNotificationsStore.getState().markAllAsRead();
    };

    chatSocket.on("notification:new", handleNewNotification);
    chatSocket.on("notification:read", handleNotificationRead);
    chatSocket.on("notification:all-read", handleAllRead);

    return () => {
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
