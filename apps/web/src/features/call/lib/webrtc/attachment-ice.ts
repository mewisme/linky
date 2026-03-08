import { fetchIceServersDual } from "./webrtc";

export interface AttachmentIceServers {
  staticIceServers: RTCIceServer[];
  cloudflareIceServers: RTCIceServer[];
}

export async function getAttachmentIceServers(
  getToken: (opts?: { skipCache?: boolean }) => Promise<string | null>
): Promise<AttachmentIceServers> {
  const token = await getToken({ skipCache: false });
  const dual = await fetchIceServersDual(token);
  return {
    staticIceServers: dual.staticIceServers,
    cloudflareIceServers: dual.cloudflareIceServers,
  };
}
