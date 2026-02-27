"use client";

import { useCallback } from "react";

export type SoundName = "success";

const SOUNDS_DIR = "/sounds";

const audioCache = new Map<SoundName, HTMLAudioElement>();

function getAudio(soundName: SoundName) {
  let audio = audioCache.get(soundName);

  if (!audio) {
    audio = new Audio(`${SOUNDS_DIR}/${soundName}.mp3`);
    audio.preload = "auto";
    audioCache.set(soundName, audio);
  }

  return audio;
}

export function useSound() {
  const play = useCallback(
    (
      soundName: SoundName,
      options?: {
        volume?: number;
        loop?: boolean;
      }
    ) => {
      const audio = getAudio(soundName);

      audio.currentTime = 0;
      audio.volume = options?.volume ?? 0.7;
      audio.loop = options?.loop ?? false;

      audio.play().catch(() => { });
    },
    []
  );

  const stop = useCallback((soundName: SoundName) => {
    const audio = audioCache.get(soundName);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const stopAll = useCallback(() => {
    audioCache.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  const isPlaying = useCallback((soundName: SoundName): boolean => {
    const audio = audioCache.get(soundName);
    return audio ? !audio.paused : false;
  }, []);

  return { play, stop, stopAll, isPlaying };
}