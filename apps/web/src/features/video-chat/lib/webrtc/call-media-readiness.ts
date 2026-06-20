export interface CallMediaReadinessInput {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteCameraEnabled: boolean;
  transportReady: boolean;
}

function hasLiveTrack(
  stream: MediaStream | null,
  kind: "audio" | "video",
): boolean {
  if (!stream) return false;
  const tracks =
    kind === "audio" ? stream.getAudioTracks() : stream.getVideoTracks();
  return tracks.some((track) => track.readyState === "live");
}

export function isCallMediaReadyForInCall(
  input: CallMediaReadinessInput,
): boolean {
  if (!input.transportReady) return false;
  if (!hasLiveTrack(input.localStream, "audio")) return false;
  if (!hasLiveTrack(input.remoteStream, "audio")) return false;
  if (input.remoteCameraEnabled && !hasLiveTrack(input.remoteStream, "video")) {
    return false;
  }
  return true;
}
