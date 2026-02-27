"use client";

import * as Sentry from "@sentry/nextjs";

import {
  getExistingSubscription,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeToPushNotifications,
} from "@/lib/push/service-worker";
import {
  getVapidPublicKey as getVapidPublicKeyAPI,
  subscribeToPush as subscribeToPushAPI,
  unsubscribeFromPush as unsubscribeFromPushAPI,
} from "@/lib/api/push-subscriptions";
import { useCallback, useEffect, useRef } from "react";

import { toast } from "@ws/ui/components/ui/sonner";
import { usePushSubscriptionStore } from "@/stores/push-subscription-store";
import { useUserContext } from "@/components/providers/user/user-provider";

export function usePushNotifications() {
  const { state: { getToken }, authReady } = useUserContext();
  const isSubscribed = usePushSubscriptionStore((s) => s.isSubscribed);
  const permissionState = usePushSubscriptionStore((s) => s.permissionState);
  const setSubscribed = usePushSubscriptionStore((s) => s.setSubscribed);
  const setPermissionState = usePushSubscriptionStore((s) => s.setPermissionState);
  const initRef = useRef(false);

  useEffect(() => {
    if (!authReady || initRef.current) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;

    initRef.current = true;
    setPermissionState(Notification.permission);

    void getExistingSubscription().then((sub) => {
      if (sub) {
        setSubscribed(true);
      }
    });
  }, [authReady, setPermissionState, setSubscribed]);

  const enablePush = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      Sentry.metrics.count("push_notifications_not_supported", 1);
      Sentry.logger.error("Push notifications are not supported in this browser");
      toast.error("Push notifications are not supported in this browser");
      return;
    }

    try {
      const permission = await requestNotificationPermission();
      setPermissionState(permission);

      if (permission !== "granted") {
        Sentry.metrics.count("push_notifications_permission_denied", 1);
        Sentry.logger.error("Notification permission denied");
        toast.error("Notification permission denied");
        return;
      }

      const registration = await registerServiceWorker();
      const token = await getToken();
      if (!token) {
        Sentry.metrics.count("push_notifications_token_not_found", 1);
        Sentry.logger.error("Please sign in again to enable push notifications");
        toast.error("Please sign in again to enable push notifications");
        return;
      }
      const { publicKey } = await getVapidPublicKeyAPI(token);
      const subscription = await subscribeToPushNotifications(
        registration,
        publicKey
      );

      await subscribeToPushAPI(subscription.toJSON(), token);
      setSubscribed(true);
      Sentry.metrics.count("push_notifications_enabled", 1);
      Sentry.logger.info("Push notifications enabled");
      toast.success("Push notifications enabled");
    } catch (error) {
      Sentry.metrics.count("push_notifications_enable_failed", 1);
      Sentry.logger.error("Failed to enable push notifications", { error: error instanceof Error ? error.message : "Unknown error" });
      const message =
        error instanceof Error ? error.message : "Failed to enable push notifications";
      const isUnauthorized =
        typeof message === "string" &&
        (message.toLowerCase().includes("unauthorized") || message.includes("401"));
      Sentry.metrics.count(isUnauthorized ? "push_notifications_unauthorized" : "push_notifications_enable_failed", 1);
      Sentry.logger.error(isUnauthorized ? "Unauthorized" : "Failed to enable push notifications", { error: message });
      toast.error(
        isUnauthorized
          ? "Session expired or invalid. Please sign in again and try enabling push notifications."
          : message
      );

    }
  }, [getToken, setPermissionState, setSubscribed]);

  const disablePush = useCallback(async () => {
    try {
      const existingSub = await getExistingSubscription();
      if (!existingSub) {
        Sentry.metrics.count("push_notifications_disabled", 1);
        Sentry.logger.info("Push notifications disabled");
        setSubscribed(false);
        return;
      }

      const endpoint = existingSub.endpoint;
      await existingSub.unsubscribe();

      const token = await getToken();
      if (token) {
        await unsubscribeFromPushAPI(endpoint, token);
      }

      setSubscribed(false);
      toast.success("Push notifications disabled");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to disable push notifications"
      );
    }
  }, [getToken, setSubscribed]);

  return {
    isSubscribed,
    permissionState,
    enablePush,
    disablePush,
  };
}
