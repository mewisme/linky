"use client";

import { useEffect, useRef } from "react";


interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  playsInline?: boolean;
  aspectRatio?: string | number;
  className?: string;
  objectFit?: "contain" | "cover";
  objectPosition?: string;
  isMobile?: boolean;
  onError?: (error: Error) => void;
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
  onError,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

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
                console.error("Error playing video:", error);
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
      }}
    />
  );
}

