"use client";

import { create } from "zustand";

interface PushSubscriptionStore {
  isSubscribed: boolean;
  permissionState: NotificationPermission;

  setSubscribed: (subscribed: boolean) => void;
  setPermissionState: (state: NotificationPermission) => void;
}

export const usePushSubscriptionStore = create<PushSubscriptionStore>((set) => ({
  isSubscribed: false,
  permissionState: "default",

  setSubscribed: (isSubscribed) => set({ isSubscribed }),
  setPermissionState: (permissionState) => set({ permissionState }),
}));
