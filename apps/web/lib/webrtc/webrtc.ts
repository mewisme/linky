import { client } from "@/lib/client/client";

export interface IceServersResponse {
  iceServers: RTCIceServer[];
}

export async function fetchIceServers(token: string | null): Promise<RTCIceServer[]> {
  try {
    const response = await client.get<IceServersResponse>("/api/media/ice-servers", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.iceServers;
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
