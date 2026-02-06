"use client";

import { useCallback, useRef, useState } from "react";

import { toast } from "@repo/ui/components/ui/sonner";

export function useScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startScreenShare = useCallback(async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as MediaTrackConstraints,
        audio: false,
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener("ended", () => {
          streamRef.current = null;
          setIsSharing(false);
        });
      }

      streamRef.current = stream;
      setIsSharing(true);
      return stream;
    } catch {
      toast.error("Failed to start screen sharing");
      throw new Error("Screen sharing cancelled or failed");
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
