"use client";

import { getUserMedia, stopMediaStream } from "@/lib/webrtc/webrtc";
import { useCallback, useEffect, useMemo, useRef } from "react";

export function useMediaStream() {
  const streamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  const isVideoOffRef = useRef(false);

  const acquireMedia = useCallback(async (
    initialMuted?: boolean,
    initialVideoOff?: boolean
  ): Promise<MediaStream> => {
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
    }

    if (initialMuted !== undefined) {
      isMutedRef.current = initialMuted;
    }
    if (initialVideoOff !== undefined) {
      isVideoOffRef.current = initialVideoOff;
    }

    const stream = await getUserMedia(true, true);
    streamRef.current = stream;

    if (isMutedRef.current) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    if (isVideoOffRef.current) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    return stream;
  }, []);

  const toggleMute = useCallback((): boolean => {
    if (!streamRef.current) return isMutedRef.current;

    const newMutedState = !isMutedRef.current;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMutedState;
    });
    isMutedRef.current = newMutedState;

    return newMutedState;
  }, []);

  const toggleVideo = useCallback((): boolean => {
    if (!streamRef.current) return isVideoOffRef.current;

    const newVideoOffState = !isVideoOffRef.current;
    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !newVideoOffState;
    });
    isVideoOffRef.current = newVideoOffState;

    return newVideoOffState;
  }, []);

  const getStream = useCallback((): MediaStream | null => {
    return streamRef.current;
  }, []);

  const releaseMedia = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    isMutedRef.current = false;
    isVideoOffRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      releaseMedia();
    };
  }, [releaseMedia]);

  return useMemo(
    () => ({
      acquireMedia,
      toggleMute,
      toggleVideo,
      getStream,
      releaseMedia,
      streamRef,
      isMutedRef,
      isVideoOffRef,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}
