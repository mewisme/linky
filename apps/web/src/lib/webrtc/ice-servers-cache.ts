import { fetchIceServers } from "./webrtc";
import { useIceServersStore } from "@/stores/ice-servers-store";

const ICE_SERVER_TTL_MS = 300_000;
const ICE_SERVER_SAFETY_FACTOR = 0.8;
const MIN_FETCH_INTERVAL_MS = 120_000;
const MAX_ICE_RESTARTS_PER_SESSION = 2;
const ICE_RESTART_SESSION_WINDOW_MS = 60_000;

let rehydrated = false;

async function ensureRehydrated(): Promise<void> {
  if (rehydrated) return;
  await useIceServersStore.persist.rehydrate();
  rehydrated = true;
}

class IceServerCacheManager {
  private inFlightFetch: Promise<RTCIceServer[]> | null = null;

  private getStore() {
    return useIceServersStore.getState();
  }

  private isCacheValid(): boolean {
    const { servers, fetchedAt, ttl } = this.getStore();
    if (!servers || servers.length === 0) return false;

    const now = Date.now();
    const validUntil = fetchedAt + ttl * ICE_SERVER_SAFETY_FACTOR;
    return now < validUntil;
  }

  private isNearExpiry(): boolean {
    const { servers, fetchedAt, ttl } = this.getStore();
    if (!servers) return true;

    const now = Date.now();
    const age = now - fetchedAt;
    const expiryThreshold = ttl * ICE_SERVER_SAFETY_FACTOR;
    return age >= expiryThreshold;
  }

  private canFetch(reason: "initial" | "expired" | "forced"): boolean {
    const { servers, lastFetchTimestamp } = this.getStore();
    const now = Date.now();
    const timeSinceLastFetch = lastFetchTimestamp === 0 ? now : now - lastFetchTimestamp;

    if (reason === "forced") return true;
    if (reason === "initial") return !servers || !this.isCacheValid();
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
    getToken: (options: { skipCache?: boolean }) => Promise<string | null>,
    reason: "initial" | "expired" | "forced" = "initial"
  ): Promise<RTCIceServer[]> {
    await ensureRehydrated();

    const { servers, fetchedAt } = this.getStore();
    if (this.isCacheValid() && reason !== "forced" && servers) {
      const age = Date.now() - fetchedAt;
      console.info(`[IceServerCache] Using cached ICE servers (age: ${Math.round(age / 1000)}s)`);
      return servers;
    }

    if (this.inFlightFetch) {
      console.info("[IceServerCache] Waiting for in-flight fetch");
      return await this.inFlightFetch;
    }

    if (!this.canFetch(reason)) {
      if (servers) {
        console.warn(`[IceServerCache] Fetch skipped (reason: ${reason}), using cached servers`);
        return servers;
      }
      throw new Error("No ICE servers available and fetch is rate-limited");
    }

    useIceServersStore.getState().setLastFetchTimestamp(Date.now());
    console.info(`[IceServerCache] Fetching ICE servers (reason: ${reason})`);

    const fetchPromise = (async () => {
      try {
        const token = await getToken({ skipCache: reason === "forced" });
        if (!token) {
          throw new Error("No token available for ICE servers");
        }

        const newServers = await fetchIceServers(token);
        const prevFetchedAt = this.getStore().fetchedAt;
        const age = prevFetchedAt > 0 ? Date.now() - prevFetchedAt : 0;

        useIceServersStore.getState().setCache(newServers, ICE_SERVER_TTL_MS);

        console.info(`[IceServerCache] ICE servers fetched successfully (${newServers.length} servers, cache age: ${Math.round(age / 1000)}s)`);
        return newServers;
      } catch (err) {
        console.error("[IceServerCache] Failed to fetch ICE servers:", err);
        const fallback = this.getStore().servers;
        if (fallback) {
          console.warn("[IceServerCache] Falling back to cached servers");
          return fallback;
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
    const { iceRestartCount, iceRestartWindowStart } = this.getStore();
    const now = Date.now();

    let count = iceRestartCount;
    let windowStart = iceRestartWindowStart;

    if (now - windowStart > ICE_RESTART_SESSION_WINDOW_MS) {
      count = 0;
      windowStart = now;
    }

    count++;
    useIceServersStore.getState().setIceRestartState(count, windowStart);

    if (count > MAX_ICE_RESTARTS_PER_SESSION) {
      console.warn(`[IceServerCache] ICE restart limit exceeded (${count} restarts in window)`);
      return false;
    }

    console.info(`[IceServerCache] ICE restart recorded (${count}/${MAX_ICE_RESTARTS_PER_SESSION} in window)`);
    return true;
  }

  resetSession(): void {
    useIceServersStore.getState().resetSession();
    console.info("[IceServerCache] Session reset");
  }

  getCachedServers(): RTCIceServer[] | null {
    return this.getStore().servers ?? null;
  }

  isExpired(): boolean {
    return !this.isCacheValid();
  }
}

export const iceServerCache = new IceServerCacheManager();
