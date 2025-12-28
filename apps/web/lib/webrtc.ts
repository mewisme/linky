/**
 * WebRTC utilities for managing peer connections and media streams
 */

import { client } from "@/lib/client";

export interface IceServersResponse {
  iceServers: RTCIceServer[];
}

/**
 * Fetches ICE server configuration from the backend
 * Uses the axios client which automatically includes Clerk authentication token
 */
export async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await client.get<IceServersResponse>("/api/ice-servers");
    return response.data.iceServers;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch ICE servers: ${error.message}`);
    }
    throw new Error("Failed to fetch ICE servers: Unknown error");
  }
}

/**
 * Creates a new RTCPeerConnection with ICE servers
 */
export function createPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
  });
}

/**
 * Gets user media (camera and microphone)
 */
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

/**
 * Stops all tracks in a media stream
 */
export function stopMediaStream(stream: MediaStream | null): void {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
}

/**
 * Closes a peer connection and cleans up
 */
export function closePeerConnection(pc: RTCPeerConnection | null): void {
  if (pc) {
    // Remove all event handlers to prevent stale handlers from firing
    pc.ontrack = null;
    pc.onicecandidate = null;
    pc.onconnectionstatechange = null;
    pc.oniceconnectionstatechange = null;
    pc.onicegatheringstatechange = null;
    // Close the connection
    pc.close();
  }
}

