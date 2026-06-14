import { VIDEO_CHAT_NO_MICROPHONE_ERROR_MESSAGE } from "./video-chat-media-errors";
import {
  getCaptureConstraintsForQuality,
} from "./stream-video-quality";
import type { StreamVideoQuality } from "@/entities/user/lib/user-settings-preferences";

function isDeviceNotFoundError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotFoundError" || error.name === "DevicesNotFoundError")
  );
}

function isCameraPermissionError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
  );
}

function shouldRetryWithoutVideo(error: unknown): boolean {
  if (!(error instanceof DOMException)) {
    return false;
  }

  return (
    isDeviceNotFoundError(error) ||
    isCameraPermissionError(error) ||
    error.name === "NotReadableError" ||
    error.name === "TrackStartError" ||
    error.name === "OverconstrainedError" ||
    error.name === "AbortError"
  );
}

export { VIDEO_CHAT_NO_MICROPHONE_ERROR_MESSAGE, isVideoChatNoMicrophoneError } from "./video-chat-media-errors";

function getMediaErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "An unexpected error occurred while accessing your camera/microphone.";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera/microphone access was denied. Please allow access in your browser settings and try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return VIDEO_CHAT_NO_MICROPHONE_ERROR_MESSAGE;
    case "NotReadableError":
    case "TrackStartError":
      return "Your camera or microphone is already in use by another application. Please close it and try again.";
    case "OverconstrainedError":
      return "Your camera does not support the requested video quality. Trying with default settings may help.";
    case "AbortError":
      return "Media access was interrupted. Please try again.";
    case "SecurityError":
      return "Media access is blocked by your browser's security policy. Ensure you are using HTTPS.";
    default:
      return `Failed to access camera/microphone: ${error.message}`;
  }
}

export async function getUserMedia(
  video: boolean = true,
  audio: boolean = true,
  quality: StreamVideoQuality = "sd"
): Promise<MediaStream> {
  const videoConstraints = video ? getCaptureConstraintsForQuality(quality) : false;
  const audioConstraints: MediaTrackConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: audio ? audioConstraints : false,
    });
  } catch (error) {
    if (video && shouldRetryWithoutVideo(error)) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: audio ? audioConstraints : false,
        });
      } catch (audioOnlyError) {
        throw new Error(getMediaErrorMessage(audioOnlyError));
      }
    }
    throw new Error(getMediaErrorMessage(error));
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}
