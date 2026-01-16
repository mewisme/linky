"use client";

import { useCallback } from "react";
import { useSound, type SoundName } from "./use-sound";
import { useUserContext } from "@/components/providers/user";

/**
 * Wrapper hook that combines useSound with userSettings
 * Automatically respects the user's notification_sound_enabled setting
 * 
 * @example
 * ```tsx
 * const { play } = useSoundWithSettings();
 * 
 * // Will only play if user has notification_sound_enabled = true
 * play('success');
 * 
 * // Force play even if user disabled sounds
 * play('success', { ignoreSettings: true });
 * ```
 */
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
        ignoreSettings?: boolean; // If true, play even if user disabled sounds
      }
    ) => {
      // Check if sound is enabled in user settings (unless ignoreSettings is true)
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
