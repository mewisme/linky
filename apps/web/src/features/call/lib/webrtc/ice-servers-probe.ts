const PROBE_TIMEOUT_MS = 8000;

export function probeIceServers(iceServers: RTCIceServer[]): Promise<number> {
  if (!iceServers.length) return Promise.resolve(Number.POSITIVE_INFINITY);

  return new Promise((resolve) => {
    const start = performance.now();
    let resolved = false;

    const finish = (ms: number) => {
      if (resolved) return;
      resolved = true;
      pc.close();
      resolve(ms);
    };

    const pc = new RTCPeerConnection({ iceServers });
    const timeoutId = setTimeout(() => finish(Number.POSITIVE_INFINITY), PROBE_TIMEOUT_MS);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeoutId);
        finish(performance.now() - start);
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeoutId);
          finish(performance.now() - start);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        finish(Number.POSITIVE_INFINITY);
      });
  });
}

export function mergeIceServersBySpeed(
  staticServers: RTCIceServer[],
  cloudflareServers: RTCIceServer[],
  staticMs: number,
  cloudflareMs: number
): RTCIceServer[] {
  const useStaticFirst = staticMs <= cloudflareMs;
  if (useStaticFirst) {
    return cloudflareServers.length > 0
      ? [...staticServers, ...cloudflareServers]
      : [...staticServers];
  }
  return staticServers.length > 0
    ? [...cloudflareServers, ...staticServers]
    : [...cloudflareServers];
}
