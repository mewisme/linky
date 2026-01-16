"use client";

import { useCallback, useEffect, useRef } from "react";

export type SoundName = "success";

const SOUNDS_DIR = "/sounds";

/**
 * Hook to play sound effects from the public/sounds directory
 * 
 * @example
 * ```tsx
 * const { play, stop, stopAll, isPlaying } = useSound();
 * 
 * // Play a sound
 * play('success');
 * 
 * // Play with custom volume
 * play('success', { volume: 0.5 });
 * 
 * // Play with loop
 * play('success', { loop: true });
 * 
 * // Stop a sound
 * stop('success');
 * 
 * // Check if playing
 * if (isPlaying('success')) {
 *   stop('success');
 * }
 * ```
 */
export function useSound() {
  const audioRefs = useRef<Map<SoundName, HTMLAudioElement>>(new Map());

  // Preload sounds on mount
  useEffect(() => {
    const sounds: SoundName[] = ["success"];
    const audioMap = new Map<SoundName, HTMLAudioElement>();

    sounds.forEach((soundName) => {
      const audio = new Audio(`${SOUNDS_DIR}/${soundName}.mp3`);
      audio.preload = "auto";
      audioMap.set(soundName, audio);
      audioRefs.current.set(soundName, audio);
    });

    return () => {
      // Cleanup: pause and remove all audio instances
      audioMap.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  /**
   * Play a sound effect
   * @param soundName - Name of the sound file (without extension)
   * @param options - Optional configuration for playback
   */
  const play = useCallback(
    (
      soundName: SoundName,
      options?: {
        volume?: number; // 0.0 to 1.0, default: 0.7
        loop?: boolean; // Whether to loop the sound, default: false
      }
    ) => {
      const audio = audioRefs.current.get(soundName);
      if (!audio) {
        console.warn(`Sound "${soundName}" not found`);
        return;
      }

      // Reset audio to beginning
      audio.currentTime = 0;

      // Set volume (default to 0.7 if not specified)
      audio.volume = options?.volume ?? 0.7;

      // Set loop
      if (options?.loop !== undefined) {
        audio.loop = options.loop;
      } else {
        audio.loop = false;
      }

      // Play the sound
      audio.play().catch((error) => {
        console.error(`Failed to play sound "${soundName}":`, error);
      });
    },
    []
  );

  /**
   * Stop a currently playing sound
   */
  const stop = useCallback((soundName: SoundName) => {
    const audio = audioRefs.current.get(soundName);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  /**
   * Stop all currently playing sounds
   */
  const stopAll = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  /**
   * Check if a sound is currently playing
   */
  const isPlaying = useCallback((soundName: SoundName): boolean => {
    const audio = audioRefs.current.get(soundName);
    return audio ? !audio.paused : false;
  }, []);

  return {
    play,
    stop,
    stopAll,
    isPlaying,
  };
}
