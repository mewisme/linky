"use client";

import { ensureServiceWorkerRegistered } from "@/lib/push/service-worker";
import { toast } from "@ws/ui/components/ui/sonner";
import { useEffect } from "react";

export function ServiceWorkerUpdateProvider() {
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
      toast.message("Got new update", {
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: "Reload",
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
  }, []);

  return null;
}
