"use client";

import { useEffect, useState } from "react";

export function useStreamAspectRatio(stream: MediaStream | null): number | null {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setAspectRatio(null);
      return;
    }

    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      setAspectRatio(null);
      return;
    }

    const track = videoTracks[0];
    if (!track) {
      setAspectRatio(null);
      return;
    }

    const settings = track.getSettings();

    if (settings.width && settings.height && settings.height > 0) {
      const ratio = settings.width / settings.height;
      setAspectRatio(ratio);
    } else {
      setAspectRatio(null);
    }

    const handleSettingsChange = () => {
      const updatedSettings = track.getSettings();
      if (updatedSettings.width && updatedSettings.height && updatedSettings.height > 0) {
        const ratio = updatedSettings.width / updatedSettings.height;
        setAspectRatio(ratio);
      }
    };

    const handleEnded = () => {
      setAspectRatio(null);
    };

    track.addEventListener("ended", handleEnded);

    if ("addEventListener" in track) {
      track.addEventListener("settingschange", handleSettingsChange);
    }

    return () => {
      if ("removeEventListener" in track) {
        track.removeEventListener("settingschange", handleSettingsChange);
        track.removeEventListener("ended", handleEnded);
      }
    };
  }, [stream]);

  return aspectRatio;
}
