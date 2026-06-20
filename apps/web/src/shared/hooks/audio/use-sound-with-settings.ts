"use client";

import { useCallback } from "react";
import { useSound, type SoundName } from "./use-sound";
import { useUserContext } from "@/providers/user/user-provider";
import { normalizeUserNotificationPreferences } from "@/entities/user/lib";

export function useSoundWithSettings() {
  const { play: basePlay, stop, stopAll, isPlaying } = useSound();
  const {
    store: { userSettings },
  } = useUserContext();

  const notificationSoundEnabled = normalizeUserNotificationPreferences(
    userSettings?.notification,
  ).sound_enabled;

  const play = useCallback(
    (
      soundName: SoundName,
      options?: {
        volume?: number;
        loop?: boolean;
        ignoreSettings?: boolean;
      },
    ) => {
      const soundEnabled = options?.ignoreSettings || notificationSoundEnabled;

      if (!soundEnabled) {
        return;
      }

      basePlay(soundName, {
        volume: options?.volume,
        loop: options?.loop,
      });
    },
    [basePlay, notificationSoundEnabled],
  );

  return {
    play,
    stop,
    stopAll,
    isPlaying,
  };
}
