"use client";

import { useEffect, useState } from "react";

import {
  E2E_INJECT_STORAGE_KEY,
  E2E_REQUEST_HEADER,
} from "@/features/video-chat/lib/e2e/constants";

export function useE2eRelaxedCall(): boolean {
  const [relaxedCall, setRelaxedCall] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem(E2E_INJECT_STORAGE_KEY);
    if (!key) {
      return;
    }

    void fetch("/api/e2e/session", {
      headers: { [E2E_REQUEST_HEADER]: key },
    })
      .then((response) => response.json())
      .then((data: { relaxedCall?: boolean }) => {
        if (data.relaxedCall === true) {
          setRelaxedCall(true);
        }
      })
      .catch(() => {});
  }, []);

  return relaxedCall;
}
