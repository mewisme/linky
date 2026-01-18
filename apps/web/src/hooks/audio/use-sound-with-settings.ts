"use client";

import { useCallback } from "react";
import { useSound, type SoundName } from "./use-sound";
import { useUserContext } from "@/components/providers/user/user-provider";

export function useSoundWithSettings() {
  const { play: basePlay, stop, stopAll, isPlaying } = useSound();
  const {
    store: { userSettings },
  } = useUserContext();

  const play = useCallback(
    (
      soundName: SoundName,
      options?: {
        volume?: number;
        loop?: boolean;
        ignoreSettings?: boolean;
      }
    ) => {
      const soundEnabled =
        options?.ignoreSettings ||
        userSettings?.notification_sound_enabled !== false;

      if (!soundEnabled) {
        return;
      }

      basePlay(soundName, {
        volume: options?.volume,
        loop: options?.loop,
      });
    },
    [basePlay, userSettings?.notification_sound_enabled]
  );

  return {
    play,
    stop,
    stopAll,
    isPlaying,
  };
}
