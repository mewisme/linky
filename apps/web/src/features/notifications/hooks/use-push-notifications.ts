"use client";

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
} from "@/lib/http/adapters/push-subscriptions";
import { useCallback, useEffect, useRef } from "react";

import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { usePushSubscriptionStore } from "@/features/notifications/model/push-subscription-store";
import { useUserContext } from "@/providers/user/user-provider";

export function usePushNotifications() {
  const t = useTranslations("notifications");
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
      toast.error(t("pushNotSupported"));
      return;
    }

    try {
      const permission = await requestNotificationPermission();
      setPermissionState(permission);

      if (permission !== "granted") {
        toast.error(t("permissionDenied"));
        return;
      }

      const registration = await registerServiceWorker();
      const token = await getToken();
      if (!token) {
        toast.error(t("signInForPush"));
        return;
      }
      const { publicKey } = await getVapidPublicKeyAPI(token);
      const subscription = await subscribeToPushNotifications(
        registration,
        publicKey
      );

      await subscribeToPushAPI(subscription.toJSON(), token);
      setSubscribed(true);
      toast.success(t("pushEnabled"));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("enableFailed");
      const isUnauthorized =
        typeof message === "string" &&
        (message.toLowerCase().includes("unauthorized") || message.includes("401"));
      toast.error(
        isUnauthorized
          ? t("sessionExpiredPush")
          : message
      );

    }
  }, [getToken, setPermissionState, setSubscribed, t]);

  const disablePush = useCallback(async () => {
    try {
      const existingSub = await getExistingSubscription();
      if (!existingSub) {
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
      toast.success(t("pushDisabled"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("disableFailed")
      );
    }
  }, [getToken, setSubscribed, t]);

  return {
    isSubscribed,
    permissionState,
    enablePush,
    disablePush,
  };
}
