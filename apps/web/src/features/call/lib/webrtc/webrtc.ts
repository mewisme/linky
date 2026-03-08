import { apiUrl } from "@/lib/http/api-url";
import { fetchData } from "@/lib/http/client-api";
import type { MediaAPI } from "@/shared/types/media.types";

export async function fetchIceServersDual(
  token: string | null
): Promise<MediaAPI.IceServers.GetDual.Response> {
  const data = await fetchData<MediaAPI.IceServers.GetDual.Response>(
    apiUrl.media.iceServers(),
    { token: token ?? undefined }
  );
  return data;
}

export function createPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  });
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
    throw new Error(`Failed to get user media: ${error instanceof Error ? error.message : "Unknown error"}`);
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
