"use client";

import { getUserMedia, stopMediaStream } from "@/features/call/lib/webrtc/webrtc";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseMediaStreamReturn {
  acquireMedia: (initialMuted?: boolean, initialVideoOff?: boolean) => Promise<MediaStream>;
  toggleMute: () => boolean;
  toggleVideo: () => boolean;
  getStream: () => MediaStream | null;
  releaseMedia: () => void;
  hasCamera: () => boolean;
  cameraDeviceCount: number;
  canSwapCamera: () => boolean;
  swapCamera: () => Promise<MediaStreamTrack | null>;
}

export function useMediaStream(): UseMediaStreamReturn {
  const streamRef = useRef<MediaStream | null>(null);
  const isMutedRef = useRef(false);
  const isVideoOffRef = useRef(false);
  const hasCameraRef = useRef(true);
  const cameraDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const currentCameraIndexRef = useRef(0);
  const lastCameraDeviceIdRef = useRef<string | null>(null);
  const lastCameraLabelRef = useRef<string | null>(null);
  const swapInProgressRef = useRef(false);
  const [cameraDeviceCount, setCameraDeviceCount] = useState(0);

  const refreshCameraDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      cameraDevicesRef.current = [];
      setCameraDeviceCount(0);
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === "videoinput");
    cameraDevicesRef.current = cameras;
    setCameraDeviceCount(cameras.length);

    if (currentCameraIndexRef.current >= cameras.length) {
      currentCameraIndexRef.current = 0;
    }
  }, []);

  useEffect(() => {
    void refreshCameraDevices();
    const handler = () => {
      void refreshCameraDevices();
    };
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, [refreshCameraDevices]);

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

    const videoTracks = stream.getVideoTracks();
    hasCameraRef.current = videoTracks.length > 0;
    lastCameraDeviceIdRef.current = videoTracks[0]?.getSettings?.().deviceId ?? null;
    lastCameraLabelRef.current = videoTracks[0]?.label ?? null;

    if (!hasCameraRef.current) {
      isVideoOffRef.current = true;
    }

    await refreshCameraDevices();

    if (isMutedRef.current) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    if (isVideoOffRef.current && videoTracks.length > 0) {
      videoTracks.forEach((track) => {
        track.enabled = false;
      });
    }

    return stream;
  }, [refreshCameraDevices]);

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
    if (streamRef.current.getVideoTracks().length === 0) {
      isVideoOffRef.current = true;
      hasCameraRef.current = false;
      return true;
    }

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
    hasCameraRef.current = true;
    cameraDevicesRef.current = [];
    currentCameraIndexRef.current = 0;
    setCameraDeviceCount(0);
  }, []);

  const hasCamera = useCallback((): boolean => {
    return hasCameraRef.current;
  }, []);

  const canSwapCamera = useCallback((): boolean => {
    return cameraDevicesRef.current.length > 1;
  }, []);

  const swapCamera = useCallback(async (): Promise<MediaStreamTrack | null> => {
    const stream = streamRef.current;
    if (!stream) {
      return null;
    }

    if (swapInProgressRef.current) {
      return null;
    }

    swapInProgressRef.current = true;
    try {
      await refreshCameraDevices();

      const cameras = cameraDevicesRef.current;
      if (cameras.length < 2) {
        return null;
      }

      const currentTrack = stream.getVideoTracks()[0];
      const currentFacingMode = (currentTrack?.getSettings?.() as { facingMode?: string } | undefined)?.facingMode;
      if (currentFacingMode === "user" || currentFacingMode === "environment") {
        const targetFacingMode = currentFacingMode === "user" ? "environment" : "user";

        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        const nextTrack = nextStream.getVideoTracks()[0] ?? null;
        const nextFacingMode = (nextTrack?.getSettings?.() as { facingMode?: string } | undefined)?.facingMode;

        if (!nextTrack) {
          stopMediaStream(nextStream);
          return null;
        }

        if (nextFacingMode && nextFacingMode === currentFacingMode) {
          stopMediaStream(nextStream);
        } else {
          if (currentTrack) {
            stream.removeTrack(currentTrack);
            currentTrack.stop();
          }

          if (isVideoOffRef.current) {
            nextTrack.enabled = false;
          }

          stream.addTrack(nextTrack);
          lastCameraDeviceIdRef.current = nextTrack.getSettings?.().deviceId ?? lastCameraDeviceIdRef.current;
          lastCameraLabelRef.current = nextTrack.label || lastCameraLabelRef.current;
          hasCameraRef.current = true;

          return nextTrack;
        }
      }

      const currentDeviceIdFromTrack = currentTrack?.getSettings?.().deviceId ?? null;
      const currentDeviceId = currentDeviceIdFromTrack || lastCameraDeviceIdRef.current;
      const currentLabel = currentTrack?.label || lastCameraLabelRef.current;
      const currentGroupId = currentDeviceId ? cameras.find((c) => c.deviceId === currentDeviceId)?.groupId : undefined;

      if (currentDeviceId) {
        const activeIndex = cameras.findIndex((c) => c.deviceId === currentDeviceId);
        if (activeIndex >= 0) {
          currentCameraIndexRef.current = activeIndex;
        }
      }

      const maxAttempts = Math.min(4, cameras.length);
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const nextIndex = (currentCameraIndexRef.current + 1) % cameras.length;
        const nextDevice = cameras[nextIndex];
        const nextDeviceId = nextDevice?.deviceId;
        if (!nextDeviceId) {
          currentCameraIndexRef.current = nextIndex;
          continue;
        }

        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: nextDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        const nextTrack = nextStream.getVideoTracks()[0] ?? null;
        if (!nextTrack) {
          stopMediaStream(nextStream);
          currentCameraIndexRef.current = nextIndex;
          continue;
        }

        const nextActualDeviceId = nextTrack.getSettings?.().deviceId ?? null;
        const nextLabel = nextTrack.label || null;
        const nextGroupId =
          (nextActualDeviceId ? cameras.find((c) => c.deviceId === nextActualDeviceId)?.groupId : undefined) ??
          nextDevice?.groupId;

        const isSameDevice =
          (!!currentDeviceId && !!nextActualDeviceId && nextActualDeviceId === currentDeviceId) ||
          (!!currentLabel && !!nextLabel && nextLabel === currentLabel) ||
          (!!currentGroupId && !!nextGroupId && nextGroupId === currentGroupId);

        if (isSameDevice) {
          stopMediaStream(nextStream);
          currentCameraIndexRef.current = nextIndex;
          continue;
        }

        if (currentTrack) {
          stream.removeTrack(currentTrack);
          currentTrack.stop();
        }

        if (isVideoOffRef.current) {
          nextTrack.enabled = false;
        }

        stream.addTrack(nextTrack);
        const returnedIndex =
          (nextActualDeviceId ? cameras.findIndex((c) => c.deviceId === nextActualDeviceId) : -1);
        currentCameraIndexRef.current = returnedIndex >= 0 ? returnedIndex : nextIndex;
        lastCameraDeviceIdRef.current = nextActualDeviceId || nextDeviceId;
        lastCameraLabelRef.current = nextLabel;
        hasCameraRef.current = true;

        return nextTrack;
      }

      return null;
    } finally {
      swapInProgressRef.current = false;
    }
  }, [refreshCameraDevices]);

  return useMemo(
    () => ({
      acquireMedia,
      toggleMute,
      toggleVideo,
      getStream,
      releaseMedia,
      hasCamera,
      cameraDeviceCount,
      canSwapCamera,
      swapCamera,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cameraDeviceCount]
  );
}
