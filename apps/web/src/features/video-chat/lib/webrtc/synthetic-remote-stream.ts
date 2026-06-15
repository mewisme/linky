export function createSyntheticRemoteStream(localStream: MediaStream): MediaStream {
  const stream = new MediaStream();
  for (const track of localStream.getTracks()) {
    stream.addTrack(track.clone());
  }
  return stream;
}
