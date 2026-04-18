"use client";

import { ensureServiceWorkerRegistered } from "@/lib/push/service-worker";
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export function ServiceWorkerUpdateProvider() {
  const t = useTranslations("serviceWorker");

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let skipFirstControllerAssignment = !navigator.serviceWorker.controller;

    const onControllerChange = () => {
      if (skipFirstControllerAssignment) {
        skipFirstControllerAssignment = false;
        return;
      }
      toast.message(t("updateAvailable"), {
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: t("refresh"),
          onClick: () => {
            window.location.reload();
          },
        },
      });
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void ensureServiceWorkerRegistered();

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [t]);

  return null;
}
