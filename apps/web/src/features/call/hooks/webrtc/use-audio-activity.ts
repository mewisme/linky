"use client";

import * as Sentry from "@sentry/nextjs";

import { useEffect, useRef, useState } from "react";

const AUDIO_THRESHOLD = 0.01;
const CHECK_INTERVAL_MS = 100;

export function useAudioActivity(stream: MediaStream | null): boolean {
  const [hasActivity, setHasActivity] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!stream) {
      Sentry.metrics.count("audio_activity_stopped", 1);
      setHasActivity(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      Sentry.metrics.count("audio_activity_stopped", 1);
      setHasActivity(false);
      return;
    }

    try {
      Sentry.metrics.count("audio_activity_started", 1);
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray: Uint8Array<ArrayBuffer> = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      const checkAudio = () => {
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;
        if (!analyser || !dataArray) return;

        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const value = dataArray[i];
          if (value !== undefined) {
            sum += value;
          }
        }
        const average = sum / dataArray.length / 255;

        setHasActivity(average > AUDIO_THRESHOLD);
      };

      intervalRef.current = setInterval(checkAudio, CHECK_INTERVAL_MS);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        dataArrayRef.current = null;
      };
    } catch (error) {
      Sentry.metrics.count("audio_activity_failed", 1);
      Sentry.logger.error("Failed to create audio analyser", { error });
      setHasActivity(false);
      return;
    }
  }, [stream]);

  return hasActivity;
}
