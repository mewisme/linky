export interface IceServerEntry {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CloudflareTurnResponse {
  iceServers: IceServerEntry[];
}


export const STATIC_ICE_SERVERS: IceServerEntry[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

export interface IceServersDualResponse {
  staticIceServers: IceServerEntry[];
  cloudflareIceServers: IceServerEntry[];
}

