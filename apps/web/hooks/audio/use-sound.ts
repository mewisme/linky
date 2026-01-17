"use client";

import { useCallback, useEffect, useRef } from "react";

export type SoundName = "success";

const SOUNDS_DIR = "/sounds";

export function useSound() {
  const audioRefs = useRef<Map<SoundName, HTMLAudioElement>>(new Map());

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
      audioMap.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  const play = useCallback(
    (
      soundName: SoundName,
      options?: {
        volume?: number;
        loop?: boolean;
      }
    ) => {
      const audio = audioRefs.current.get(soundName);
      if (!audio) {
        console.warn(`Sound "${soundName}" not found`);
        return;
      }

      audio.currentTime = 0;

      audio.volume = options?.volume ?? 0.7;

      if (options?.loop !== undefined) {
        audio.loop = options.loop;
      } else {
        audio.loop = false;
      }

      audio.play().catch((error) => {
        console.error(`Failed to play sound "${soundName}":`, error);
      });
    },
    []
  );

  const stop = useCallback((soundName: SoundName) => {
    const audio = audioRefs.current.get(soundName);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const stopAll = useCallback(() => {
    audioRefs.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

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
