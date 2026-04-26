"use client";

import * as Sentry from "@sentry/nextjs";

import { useEffect, useRef, useState } from "react";
interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  playsInline?: boolean;
  aspectRatio?: string | number;
  className?: string;
  objectFit?: "contain" | "cover";
  objectPosition?: string;
  isMobile?: boolean;
  mirrored?: boolean;
  onError?: (error: Error) => void;
  onVideoElementChange?: (videoElement: HTMLVideoElement | null) => void;
}

export function shouldMirrorLocalPreview(
  localStream: MediaStream | null,
  isSharingScreen: boolean
): boolean {
  if (isSharingScreen) return false;
  const facing = (
    localStream?.getVideoTracks()[0]?.getSettings() as { facingMode?: string } | undefined
  )?.facingMode;
  if (facing === "environment") return false;
  return true;
}

export function useMirrorLocalPreview(
  localStream: MediaStream | null,
  isSharingScreen: boolean
): boolean {
  const [mirror, setMirror] = useState(() =>
    shouldMirrorLocalPreview(localStream, isSharingScreen)
  );

  useEffect(() => {
    const sync = () => {
      setMirror(shouldMirrorLocalPreview(localStream, isSharingScreen));
    };
    sync();
    if (!localStream) return;
    localStream.addEventListener("addtrack", sync);
    localStream.addEventListener("removetrack", sync);
    return () => {
      localStream.removeEventListener("addtrack", sync);
      localStream.removeEventListener("removetrack", sync);
    };
  }, [localStream, isSharingScreen]);

  return mirror;
}

export function VideoPlayer({
  stream,
  muted = false,
  playsInline = true,
  aspectRatio,
  className = "",
  objectFit = "contain",
  objectPosition,
  isMobile = false,
  mirrored = false,
  onError,
  onVideoElementChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    onVideoElementChange?.(videoRef.current);
    return () => onVideoElementChange?.(null);
  }, [onVideoElementChange]);

  useEffect(() => {
    if (videoRef.current && stream) {
      const video = videoRef.current;
      if (video.srcObject !== stream) {
        video.srcObject = stream;

        const attemptPlay = () => {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              const error = err instanceof Error ? err : new Error(String(err));
              if (onError) {
                onError(error);
              } else {
                Sentry.metrics.count("error_playing_video", 1);
                Sentry.logger.error("Error playing video", { error: error instanceof Error ? error.message : "Unknown error" });
              }

              if (isMobile) {
                setTimeout(() => {
                  video.play().catch(() => { });
                }, 100);
              }
            });
          }
        };

        attemptPlay();
        if (isMobile) {
          const timeoutId = setTimeout(attemptPlay, 100);
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [stream, isMobile, onError]);

  const aspectRatioStyle = aspectRatio
    ? { aspectRatio: typeof aspectRatio === "number" ? `${aspectRatio}` : aspectRatio }
    : {};

  return (
    <video
      ref={videoRef}
      autoPlay
      muted={muted}
      playsInline={playsInline}
      className={className}
      style={{
        ...aspectRatioStyle,
        objectFit,
        ...(objectPosition && { objectPosition }),
        width: '100%',
        height: '100%',
        display: 'block',
        ...(mirrored && {
          transform: 'scaleX(-1)',
          transformOrigin: 'center center',
        }),
      }}
    />
  );
}

