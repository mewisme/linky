"use client";

import * as Sentry from "@sentry/nextjs";

import { useCallback, useRef, useState } from "react";

export function useScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startScreenShare = useCallback(async (): Promise<MediaStream> => {
    try {
      Sentry.metrics.count("screen_share_started", 1);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener("ended", () => {
          Sentry.metrics.count("screen_share_ended", 1);
          streamRef.current = null;
          setIsSharing(false);
        });
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
  }, []);

  const stopScreenShare = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsSharing(false);
  }, []);

  return {
    screenStream: streamRef.current,
    isSharing,
    startScreenShare,
    stopScreenShare,
  };
}
