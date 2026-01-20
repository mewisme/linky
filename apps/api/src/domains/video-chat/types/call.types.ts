export interface CloudflareTurnResponse {
  iceServers: Array<{
    urls: string[];
    username: string;
    credential: string;
  }>;
}

