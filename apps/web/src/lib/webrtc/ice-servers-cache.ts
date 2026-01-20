import { fetchIceServers } from "./webrtc";

const ICE_SERVER_TTL_MS = 300_000;
const ICE_SERVER_SAFETY_FACTOR = 0.8;
const MIN_FETCH_INTERVAL_MS = 120_000;
const MAX_ICE_RESTARTS_PER_SESSION = 2;
const ICE_RESTART_SESSION_WINDOW_MS = 60_000;

interface IceServerCache {
  servers: RTCIceServer[];
  fetchedAt: number;
  ttl: number;
}

class IceServerCacheManager {
  private cache: IceServerCache | null = null;
  private inFlightFetch: Promise<RTCIceServer[]> | null = null;
  private lastFetchTimestamp = 0;
  private iceRestartCount = 0;
  private iceRestartWindowStart = 0;

  private isCacheValid(): boolean {
    if (!this.cache) {
      return false;
    }

    const now = Date.now();
    const validUntil = this.cache.fetchedAt + (this.cache.ttl * ICE_SERVER_SAFETY_FACTOR);

    return now < validUntil;
  }

  private isNearExpiry(): boolean {
    if (!this.cache) {
      return true;
    }

    const now = Date.now();
    const age = now - this.cache.fetchedAt;
    const expiryThreshold = this.cache.ttl * ICE_SERVER_SAFETY_FACTOR;

    return age >= expiryThreshold;
  }

  private canFetch(reason: "initial" | "expired" | "forced"): boolean {
    const now = Date.now();
    const timeSinceLastFetch = this.lastFetchTimestamp === 0 ? now : now - this.lastFetchTimestamp;

    if (reason === "forced") {
      return true;
    }

    if (reason === "initial") {
      return !this.cache || !this.isCacheValid();
    }

    if (reason === "expired") {
      if (timeSinceLastFetch < MIN_FETCH_INTERVAL_MS) {
        console.info(`[IceServerCache] Rate limited: last fetch was ${Math.round(timeSinceLastFetch / 1000)}s ago`);
        return false;
      }
      return this.isNearExpiry();
    }

    return false;
  }

  async getIceServers(
    getToken: (options: { template: 'custom' }) => Promise<string | null>,
    reason: "initial" | "expired" | "forced" = "initial"
  ): Promise<RTCIceServer[]> {
    if (this.isCacheValid() && reason !== "forced") {
      const age = Date.now() - (this.cache!.fetchedAt);
      console.info(`[IceServerCache] Using cached ICE servers (age: ${Math.round(age / 1000)}s)`);
      return this.cache!.servers;
    }

    if (this.inFlightFetch) {
      console.info("[IceServerCache] Waiting for in-flight fetch");
      return await this.inFlightFetch;
    }

    if (!this.canFetch(reason)) {
      if (this.cache) {
        console.warn(`[IceServerCache] Fetch skipped (reason: ${reason}), using cached servers`);
        return this.cache.servers;
      }
      throw new Error("No ICE servers available and fetch is rate-limited");
    }

    this.lastFetchTimestamp = Date.now();
    console.info(`[IceServerCache] Fetching ICE servers (reason: ${reason})`);

    const fetchPromise = (async () => {
      try {
        const token = await getToken({ template: 'custom' });
        if (!token) {
          throw new Error("No token available for ICE servers");
        }

        const servers = await fetchIceServers(token);
        const age = this.cache ? Date.now() - this.cache.fetchedAt : 0;

        this.cache = {
          servers,
          fetchedAt: Date.now(),
          ttl: ICE_SERVER_TTL_MS,
        };

        console.info(`[IceServerCache] ICE servers fetched successfully (${servers.length} servers, cache age: ${Math.round(age / 1000)}s)`);
        return servers;
      } catch (err) {
        console.error("[IceServerCache] Failed to fetch ICE servers:", err);
        if (this.cache) {
          console.warn("[IceServerCache] Falling back to cached servers");
          return this.cache.servers;
        }
        throw err;
      } finally {
        this.inFlightFetch = null;
      }
    })();

    this.inFlightFetch = fetchPromise;
    return await fetchPromise;
  }

  recordIceRestart(): boolean {
    const now = Date.now();

    if (now - this.iceRestartWindowStart > ICE_RESTART_SESSION_WINDOW_MS) {
      this.iceRestartCount = 0;
      this.iceRestartWindowStart = now;
    }

    this.iceRestartCount++;

    if (this.iceRestartCount > MAX_ICE_RESTARTS_PER_SESSION) {
      console.warn(`[IceServerCache] ICE restart limit exceeded (${this.iceRestartCount} restarts in window)`);
      return false;
    }

    console.info(`[IceServerCache] ICE restart recorded (${this.iceRestartCount}/${MAX_ICE_RESTARTS_PER_SESSION} in window)`);
    return true;
  }

  resetSession(): void {
    this.iceRestartCount = 0;
    this.iceRestartWindowStart = 0;
    console.info("[IceServerCache] Session reset");
  }

  getCachedServers(): RTCIceServer[] | null {
    return this.cache?.servers || null;
  }

  isExpired(): boolean {
    return !this.isCacheValid();
  }
}

export const iceServerCache = new IceServerCacheManager();
