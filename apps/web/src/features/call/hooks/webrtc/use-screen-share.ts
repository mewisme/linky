"use client";

import * as Sentry from "@sentry/nextjs";

import { useCallback, useRef, useState } from "react";

export function useScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackEndedHandlerRef = useRef<(() => void) | null>(null);

  const removeScreenTrackEndedListener = useCallback(() => {
    const track = screenTrackRef.current;
    const handler = screenTrackEndedHandlerRef.current;
    if (track && handler) {
      track.removeEventListener("ended", handler);
      screenTrackRef.current = null;
      screenTrackEndedHandlerRef.current = null;
    }
  }, []);

  const startScreenShare = useCallback(async (): Promise<MediaStream> => {
    try {
      removeScreenTrackEndedListener();
      Sentry.metrics.count("screen_share_started", 1);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const handler = () => {
          Sentry.metrics.count("screen_share_ended", 1);
          removeScreenTrackEndedListener();
          streamRef.current = null;
          setIsSharing(false);
        };
        screenTrackRef.current = videoTrack;
        screenTrackEndedHandlerRef.current = handler;
        videoTrack.addEventListener("ended", handler);
      }

      Sentry.metrics.count("screen_share_started", 1);
      streamRef.current = stream;
      setIsSharing(true);
      return stream;
    } catch (error) {
      Sentry.metrics.count("screen_share_failed", 1);
      Sentry.logger.error("Failed to start screen sharing", { error });
      throw error;
    }
  }, [removeScreenTrackEndedListener]);

  const stopScreenShare = useCallback(() => {
    removeScreenTrackEndedListener();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsSharing(false);
  }, [removeScreenTrackEndedListener]);

  return {
    screenStream: streamRef.current,
    isSharing,
    startScreenShare,
    stopScreenShare,
  };
}
