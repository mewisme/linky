export interface CloudflareSdpDescription {
  sdp: string;
  type: "offer" | "answer";
}

export interface CloudflareSimulcastConfig {
  preferredRid?: string;
  priorityOrdering?: "none" | "asciibetical";
  ridNotAvailable?: "none" | "asciibetical";
}

export interface CloudflareTrackRequest {
  location: "local" | "remote";
  mid?: string;
  sessionId?: string;
  trackName?: string;
  bidirectionalMediaStream?: boolean;
  kind?: "audio" | "video";
  simulcast?: CloudflareSimulcastConfig;
}

export interface CloudflareTrackResponse extends CloudflareTrackRequest {
  errorCode?: string;
  errorDescription?: string;
}

export interface CloudflareTracksRequest {
  sessionDescription?: CloudflareSdpDescription;
  tracks?: CloudflareTrackRequest[];
  autoDiscover?: boolean;
}

export interface CloudflareTracksResponse {
  errorCode?: string;
  errorDescription?: string;
  requiresImmediateRenegotiation?: boolean;
  sessionDescription?: CloudflareSdpDescription;
  tracks?: CloudflareTrackResponse[];
}

export interface CloudflareNewSessionRequest {
  sessionDescription?: CloudflareSdpDescription;
}

export interface CloudflareNewSessionResponse {
  errorCode?: string;
  errorDescription?: string;
  sessionId: string;
  sessionDescription?: CloudflareSdpDescription;
}

export interface CloudflareRenegotiateRequest {
  sessionDescription: CloudflareSdpDescription;
}

export interface CloudflareCloseTracksRequest {
  tracks: { mid: string }[];
  sessionDescription?: CloudflareSdpDescription;
  force?: boolean;
}

export interface CloudflareCloseTracksResponse {
  errorCode?: string;
  errorDescription?: string;
  requiresImmediateRenegotiation?: boolean;
  sessionDescription?: CloudflareSdpDescription;
  tracks?: CloudflareTrackResponse[];
}

export class CloudflareRealtimeError extends Error {
  readonly status: number;
  readonly errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = "CloudflareRealtimeError";
    this.status = status;
    this.errorCode = errorCode;
  }
}
