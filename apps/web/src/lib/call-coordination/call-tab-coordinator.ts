import { publicEnv } from "@/env";

const logger = {
  debug: (data: unknown, msg?: string) => {
    if (publicEnv.isDev) {
      console.debug(msg || "", data);
    }
  },
  info: (data: unknown, msg?: string) => {
    console.info(msg || "", data);
  },
  warn: (data: unknown, msg?: string) => {
    console.warn(msg || "", data);
  },
  error: (data: unknown, msg?: string) => {
    console.error(msg || "", data);
  },
};

const BROADCAST_CHANNEL_NAME = "linky-call";
const STORAGE_KEY_ACTIVE_TAB = "linky:activeCallTabId";
const STORAGE_KEY_ACTIVE_ROOM = "linky:activeCallRoomId";
const STORAGE_KEY_CALL_STARTED_AT = "linky:callStartedAt";
const HEARTBEAT_INTERVAL_MS = 3000;
const HEARTBEAT_TIMEOUT_MS = 6000;

export type CallCoordinationMessage =
  | { type: "HEARTBEAT"; tabId: string; roomId: string | null; timestamp: number }
  | { type: "SWITCH_REQUEST"; requestingTabId: string }
  | { type: "SWITCH_APPROVED"; oldTabId: string; newTabId: string }
  | { type: "OWNER_RELEASED"; tabId: string }
  | { type: "CLAIM_OWNERSHIP"; tabId: string; roomId: string | null };

export interface CallTabState {
  tabId: string;
  activeCallTabId: string | null;
  activeCallRoomId: string | null;
  activeCallStartedAt: number | null;
  isCallOwner: boolean;
}

type StateChangeCallback = (state: CallTabState) => void;

class CallTabCoordinator {
  private tabId: string | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private heartbeatCheckIntervalId: NodeJS.Timeout | null = null;
  private lastHeartbeatTimestamp: number | null = null;
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();
  private isInitialized = false;

  constructor() {}

  private ensureTabId(): string {
    if (this.tabId) {
      return this.tabId;
    }

    if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
      this.tabId = `ssr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      return this.tabId;
    }

    const existingTabId = sessionStorage.getItem("linky:tabId");
    if (existingTabId) {
      this.tabId = existingTabId;
      return existingTabId;
    }

    const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("linky:tabId", newTabId);
    this.tabId = newTabId;
    return newTabId;
  }

  initialize(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (this.isInitialized) {
      logger.debug({ tabId: this.ensureTabId() }, "CallTabCoordinator already initialized");
      return;
    }

    this.ensureTabId();
    this.setupBroadcastChannel();
    this.setupStorageListener();
    this.startHeartbeatMonitoring();
    this.isInitialized = true;

    logger.info({ tabId: this.ensureTabId() }, "CallTabCoordinator initialized");
  }

  destroy(): void {
    if (!this.isInitialized) return;

    this.stopHeartbeat();
    this.stopHeartbeatMonitoring();
    this.broadcastChannel?.close();

    if (typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorageChange);
    }

    this.stateChangeCallbacks.clear();
    this.isInitialized = false;

    logger.info({ tabId: this.ensureTabId() }, "CallTabCoordinator destroyed");
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === "undefined") {
      logger.warn("BroadcastChannel not available, using localStorage fallback only");
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      this.broadcastChannel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      logger.error({ error }, "Failed to create BroadcastChannel");
    }
  }

  private setupStorageListener(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", this.handleStorageChange);
    }
  }

  private handleStorageChange = (event: StorageEvent): void => {
    if (
      event.key === STORAGE_KEY_ACTIVE_TAB ||
      event.key === STORAGE_KEY_ACTIVE_ROOM ||
      event.key === STORAGE_KEY_CALL_STARTED_AT
    ) {
      this.notifyStateChange();
    }
  };

  private handleMessage(message: CallCoordinationMessage): void {
    const tabId = this.ensureTabId();
    logger.debug({ message, tabId }, "Received coordination message");

    switch (message.type) {
      case "HEARTBEAT":
        if (message.tabId !== tabId) {
          this.lastHeartbeatTimestamp = message.timestamp;
        }
        break;

      case "SWITCH_REQUEST":
        if (message.requestingTabId !== tabId && this.isCallOwner()) {
          this.handleSwitchRequest(message.requestingTabId);
        }
        break;

      case "SWITCH_APPROVED":
        if (message.newTabId === tabId) {
          this.notifyStateChange();
        } else if (message.oldTabId === tabId) {
          this.notifyStateChange();
        }
        break;

      case "OWNER_RELEASED":
        if (message.tabId !== tabId) {
          this.notifyStateChange();
        }
        break;

      case "CLAIM_OWNERSHIP":
        if (message.tabId !== tabId) {
          this.notifyStateChange();
        }
        break;
    }
  }

  private broadcastMessage(message: CallCoordinationMessage): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (error) {
        logger.error({ error, message }, "Failed to broadcast message");
      }
    }
  }

  private handleSwitchRequest(requestingTabId: string): void {
    const tabId = this.ensureTabId();
    logger.info(
      { requestingTabId, currentOwner: tabId },
      "Handling switch request from another tab"
    );

    this.releaseOwnership();

    this.broadcastMessage({
      type: "SWITCH_APPROVED",
      oldTabId: tabId,
      newTabId: requestingTabId,
    });
  }

  getState(): CallTabState {
    const tabId = this.ensureTabId();

    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return {
        tabId,
        activeCallTabId: null,
        activeCallRoomId: null,
        activeCallStartedAt: null,
        isCallOwner: false,
      };
    }

    const activeCallTabId = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
    const activeCallRoomId = localStorage.getItem(STORAGE_KEY_ACTIVE_ROOM);
    const callStartedAtStr = localStorage.getItem(STORAGE_KEY_CALL_STARTED_AT);
    const activeCallStartedAt = callStartedAtStr ? parseInt(callStartedAtStr, 10) : null;

    return {
      tabId,
      activeCallTabId,
      activeCallRoomId,
      activeCallStartedAt,
      isCallOwner: activeCallTabId === tabId,
    };
  }

  isCallOwner(): boolean {
    return this.getState().isCallOwner;
  }

  claimOwnership(roomId: string | null = null): boolean {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return false;
    }

    const tabId = this.ensureTabId();
    const currentOwner = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);

    if (currentOwner && currentOwner !== tabId) {
      logger.warn(
        { currentOwner, attemptingTabId: tabId },
        "Cannot claim ownership, another tab owns the call"
      );
      return false;
    }

    localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tabId);
    if (roomId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ROOM, roomId);
    }
    localStorage.setItem(STORAGE_KEY_CALL_STARTED_AT, Date.now().toString());

    this.broadcastMessage({
      type: "CLAIM_OWNERSHIP",
      tabId,
      roomId,
    });

    this.startHeartbeat();
    this.notifyStateChange();

    logger.info({ tabId, roomId }, "Claimed call ownership");
    return true;
  }

  releaseOwnership(): void {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    const wasOwner = this.isCallOwner();
    const tabId = this.ensureTabId();

    if (wasOwner) {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_TAB);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ROOM);
      localStorage.removeItem(STORAGE_KEY_CALL_STARTED_AT);

      this.stopHeartbeat();

      this.broadcastMessage({
        type: "OWNER_RELEASED",
        tabId,
      });

      this.notifyStateChange();

      logger.info({ tabId }, "Released call ownership");
    }
  }

  requestSwitch(): void {
    const tabId = this.ensureTabId();
    logger.info({ tabId }, "Requesting to switch call to this tab");

    this.broadcastMessage({
      type: "SWITCH_REQUEST",
      requestingTabId: tabId,
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      return;
    }

    const sendHeartbeat = () => {
      const state = this.getState();
      const tabId = this.ensureTabId();
      this.broadcastMessage({
        type: "HEARTBEAT",
        tabId,
        roomId: state.activeCallRoomId,
        timestamp: Date.now(),
      });
    };

    sendHeartbeat();
    this.heartbeatIntervalId = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatCheckIntervalId = setInterval(() => {
      if (typeof window === "undefined" || typeof localStorage === "undefined") {
        return;
      }

      const state = this.getState();

      if (!state.activeCallTabId || state.isCallOwner) {
        return;
      }

      const now = Date.now();
      if (
        this.lastHeartbeatTimestamp === null ||
        now - this.lastHeartbeatTimestamp > HEARTBEAT_TIMEOUT_MS
      ) {
        const tabId = this.ensureTabId();
        logger.warn(
          { activeCallTabId: state.activeCallTabId, tabId },
          "Owner tab heartbeat timeout detected, clearing stale ownership"
        );

        localStorage.removeItem(STORAGE_KEY_ACTIVE_TAB);
        localStorage.removeItem(STORAGE_KEY_ACTIVE_ROOM);
        localStorage.removeItem(STORAGE_KEY_CALL_STARTED_AT);

        this.notifyStateChange();
      }
    }, HEARTBEAT_TIMEOUT_MS);
  }

  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatCheckIntervalId) {
      clearInterval(this.heartbeatCheckIntervalId);
      this.heartbeatCheckIntervalId = null;
    }
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  private notifyStateChange(): void {
    const state = this.getState();
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(state);
      } catch (error) {
        logger.error({ error }, "Error in state change callback");
      }
    });
  }
}

export const callTabCoordinator = new CallTabCoordinator();
