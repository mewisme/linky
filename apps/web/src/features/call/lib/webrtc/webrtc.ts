import { apiUrl } from "@/lib/http/api-url";
import { fetchData } from "@/lib/http/client-api";

export interface IceServersResponse {
  iceServers: RTCIceServer[];
}

export async function fetchIceServers(token: string | null): Promise<RTCIceServer[]> {
  try {
    const data = await fetchData<IceServersResponse>(apiUrl.media.iceServers(), {
      token: token ?? undefined,
    });
    return data.iceServers;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch ICE servers: ${error.message}`);
    }
    throw new Error("Failed to fetch ICE servers: Unknown error");
  }
}

export function createPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  });
}

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
      return "No microphone found. Please connect a microphone to start a call.";
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
  audio: boolean = true
): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: video ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
      audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
    });
  } catch (error) {
    if (video && shouldRetryWithoutVideo(error)) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
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

export function closePeerConnection(pc: RTCPeerConnection | null): void {
  if (pc) {
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;
    pc.onicegatheringstatechange = null;
    pc.close();
  }
}
