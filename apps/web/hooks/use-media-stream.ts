"use client";

import { getUserMedia, stopMediaStream } from "@/lib/webrtc";
import { useCallback, useEffect, useRef } from "react";

/**
 * Hook for managing local media stream (camera/microphone)
 * Handles media device access, track control, and proper cleanup
 */
export function useMediaStream() {
  const streamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  const isVideoOffRef = useRef(false);

  /**
   * Acquire user media (camera + microphone)
   */
  const acquireMedia = useCallback(async (): Promise<MediaStream> => {
    // Clean up existing stream before acquiring new one
    if (streamRef.current) {
      stopMediaStream(streamRef.current);
    }

    const stream = await getUserMedia(true, true);
    streamRef.current = stream;

    // Apply mute state if previously muted
    if (isMutedRef.current) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    // Apply video off state if previously disabled
    if (isVideoOffRef.current) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    return stream;
  }, []);

  /**
   * Toggle audio mute state
   */
  const toggleMute = useCallback((): boolean => {
    if (!streamRef.current) return isMutedRef.current;

    const newMutedState = !isMutedRef.current;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !newMutedState;
    });
    isMutedRef.current = newMutedState;

    return newMutedState;
  }, []);

  /**
   * Toggle video on/off state
   */
  const toggleVideo = useCallback((): boolean => {
    if (!streamRef.current) return isVideoOffRef.current;

    const newVideoOffState = !isVideoOffRef.current;
    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !newVideoOffState;
    });
    isVideoOffRef.current = newVideoOffState;

    return newVideoOffState;
  }, []);

  /**
   * Get current media stream
   */
  const getStream = useCallback((): MediaStream | null => {
    return streamRef.current;
  }, []);

  /**
   * Release all media resources
   */
  const releaseMedia = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    isMutedRef.current = false;
    isVideoOffRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseMedia();
    };
  }, [releaseMedia]);

  return {
    acquireMedia,
    toggleMute,
    toggleVideo,
    getStream,
    releaseMedia,
    // Expose refs for direct access when needed
    streamRef,
    isMutedRef,
    isVideoOffRef,
  };
}

