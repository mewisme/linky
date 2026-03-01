"use client";

import * as Sentry from "@sentry/nextjs";

import { useEffect, useState } from "react";

export function useStreamAspectRatio(stream: MediaStream | null): number | null {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!stream) {
      Sentry.metrics.count("stream_aspect_ratio_stopped", 1);
      setAspectRatio(null);
      return;
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      Sentry.metrics.count("stream_aspect_ratio_stopped", 1);
      setAspectRatio(null);
      return;
    }

    const track = videoTracks[0];
    if (!track) {
      Sentry.metrics.count("stream_aspect_ratio_stopped", 1);
      setAspectRatio(null);
      return;
    }

    const settings = track.getSettings();

    if (settings.width && settings.height && settings.height > 0) {
      const ratio = settings.width / settings.height;
      Sentry.metrics.count("stream_aspect_ratio_set", 1);
      setAspectRatio(ratio);
    } else {
      Sentry.metrics.count("stream_aspect_ratio_stopped", 1);
      setAspectRatio(null);
    }

    const handleSettingsChange = () => {
      const updatedSettings = track.getSettings();
      if (updatedSettings.width && updatedSettings.height && updatedSettings.height > 0) {
        const ratio = updatedSettings.width / updatedSettings.height;
        Sentry.metrics.count("stream_aspect_ratio_set", 1);
        setAspectRatio(ratio);
      }
    };

    const handleEnded = () => {
      Sentry.metrics.count("stream_aspect_ratio_stopped", 1);
      setAspectRatio(null);
    };

    track.addEventListener("ended", handleEnded);

    if ("addEventListener" in track) {
      track.addEventListener("settingschange", handleSettingsChange);
    }

    return () => {
      if ("removeEventListener" in track) {
        Sentry.metrics.count("stream_aspect_ratio_removed", 1);
        track.removeEventListener("settingschange", handleSettingsChange);
        track.removeEventListener("ended", handleEnded);
      }
    };
  }, [stream]);

  return aspectRatio;
}
