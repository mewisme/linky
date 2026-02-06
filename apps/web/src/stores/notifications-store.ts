"use client";

import type { Notification } from "@/types/notifications.types";
import { create } from "zustand";

interface NotificationsStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;

  setNotifications: (notifications: Notification[]) => void;
  appendNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
  setLoading: (isLoading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  resetState: () => void;
}

const initialState = {
  notifications: [] as Notification[],
  unreadCount: 0,
  isLoading: false,
  hasMore: true,
};

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  ...initialState,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    }),
  appendNotifications: (newNotifications) =>
    set((s) => {
      const existingIds = new Set(s.notifications.map((n) => n.id));
      const unique = newNotifications.filter((n) => !existingIds.has(n.id));
      return {
        notifications: [...s.notifications, ...unique],
      };
    }),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + (notification.is_read ? 0 : 1),
    })),
  markAsRead: (id) =>
    set((s) => {
      const notification = s.notifications.find((n) => n.id === id);
      const wasUnread = notification && !notification.is_read;
      return {
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    }),
  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setLoading: (isLoading) => set({ isLoading }),
  setHasMore: (hasMore) => set({ hasMore }),
  resetState: () => set(initialState),
}));
