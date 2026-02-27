import * as Sentry from "@sentry/nextjs";

import type { Socket } from "socket.io-client";

const SOCKET_SILENCE_THRESHOLD_MS = 8000;
const SOCKET_RESYNC_TIMEOUT_MS = 6000;
const HEALTH_CHECK_INTERVAL_MS = 3000;
const RESYNC_DEBOUNCE_MS = 2000;

export interface SocketHealthContext {
  socket: Socket;
  isInActiveCall: () => boolean;
  getRoomInfo: () => { roomId?: string; peerId?: string } | null;
  onHalfDeadDetected: () => void;
  onResyncRequired: () => void;
  onForcedTeardown: () => void;
}

class SocketHealthMonitor {
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastEventTimestamp = 0;
  private reconnectDetected = false;
  private resyncTimeout: NodeJS.Timeout | null = null;
  private context: SocketHealthContext | null = null;
  private isMonitoring = false;
  private lastResyncAttempt = 0;
  private halfDeadDetected = false;
  private isBackgrounded = false;
  private visibilityChangeHandler: (() => void) | null = null;
  private connectHandler: (() => void) | null = null;
  private roomPingHandler: ((data: { timestamp?: number; roomId?: string }) => void) | null = null;

  private trackEvent(): void {
    this.lastEventTimestamp = Date.now();
    this.reconnectDetected = false;

    if (this.resyncTimeout) {
      clearTimeout(this.resyncTimeout);
      this.resyncTimeout = null;
    }
  }

  private checkHealth(): void {
    if (!this.context || !this.isMonitoring) {
      return;
    }

    const socket = this.context.socket;

    if (!socket.connected) {
      return;
    }

    if (this.isBackgrounded) {
      return;
    }

    const now = Date.now();
    const timeSinceLastEvent = now - this.lastEventTimestamp;
    const isInCall = this.context.isInActiveCall();

    if (isInCall && timeSinceLastEvent > SOCKET_SILENCE_THRESHOLD_MS && this.lastEventTimestamp > 0) {
      if (!this.halfDeadDetected) {
        Sentry.logger.warn("[SocketHealth] Half-dead socket detected - connected but silent", { timeSinceLastEvent });
        this.halfDeadDetected = true;
        this.context.onHalfDeadDetected();

        const now = Date.now();
        if (now - this.lastResyncAttempt > RESYNC_DEBOUNCE_MS) {
          this.lastResyncAttempt = now;
          Sentry.logger.info("[SocketHealth] Triggering resync on half-dead detection");
          this.context.onResyncRequired();
        }
      }

      if (!this.resyncTimeout) {
        this.resyncTimeout = setTimeout(() => {
          Sentry.logger.error("[SocketHealth] Socket resync timeout - forcing teardown");
          this.context?.onForcedTeardown();
        }, SOCKET_RESYNC_TIMEOUT_MS);
      }
    } else if (timeSinceLastEvent < SOCKET_SILENCE_THRESHOLD_MS) {
      this.halfDeadDetected = false;
    }

    if (this.reconnectDetected && isInCall) {
      Sentry.logger.info("[SocketHealth] Reconnect detected during active call - resync required");
      this.context.onResyncRequired();
      this.reconnectDetected = false;
    }
  }

  start(context: SocketHealthContext): void {
    if (this.isMonitoring) {
      this.stop();
    }

    this.context = context;
    this.isMonitoring = true;
    this.lastEventTimestamp = Date.now();
    this.reconnectDetected = false;
    this.isBackgrounded = typeof document !== "undefined" && document.hidden;

    const socket = context.socket;

    this.visibilityChangeHandler = () => {
      const wasBackgrounded = this.isBackgrounded;
      this.isBackgrounded = document.hidden;

      if (wasBackgrounded && !this.isBackgrounded) {
        Sentry.logger.info("[SocketHealth] App returned to foreground - resuming health checks");
        this.trackEvent();
      } else if (!wasBackgrounded && this.isBackgrounded) {
        Sentry.logger.info("[SocketHealth] App backgrounded - pausing health checks to prevent false positives");
        if (this.resyncTimeout) {
          clearTimeout(this.resyncTimeout);
          this.resyncTimeout = null;
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.visibilityChangeHandler);
    }

    this.connectHandler = () => {
      const wasConnected = this.lastEventTimestamp > 0 && Date.now() - this.lastEventTimestamp < 5000;
      if (wasConnected) {
        this.reconnectDetected = true;
        Sentry.logger.info("[SocketHealth] Socket reconnect detected");
      }
      this.trackEvent();
    };
    socket.on("connect", this.connectHandler);

    this.roomPingHandler = (data: { timestamp?: number; roomId?: string }) => {
      Sentry.logger.info("[SocketHealth] Received room-ping", { roomId: data.roomId, socketId: socket.id, timestamp: data.timestamp });
      this.trackEvent();
    };
    socket.on("room-ping", this.roomPingHandler);

    this.healthCheckInterval = setInterval(() => {
      this.checkHealth();
    }, HEALTH_CHECK_INTERVAL_MS);

    Sentry.logger.info("[SocketHealth] Socket health monitoring started");
  }

  stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.resyncTimeout) {
      clearTimeout(this.resyncTimeout);
      this.resyncTimeout = null;
    }

    if (this.visibilityChangeHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }

    if (this.context?.socket) {
      if (this.connectHandler) {
        this.context.socket.off("connect", this.connectHandler);
        this.connectHandler = null;
      }
      if (this.roomPingHandler) {
        this.context.socket.off("room-ping", this.roomPingHandler);
        this.roomPingHandler = null;
      }
    }

    this.isMonitoring = false;
    this.context = null;
    this.lastEventTimestamp = 0;
    this.reconnectDetected = false;
    this.halfDeadDetected = false;
    this.lastResyncAttempt = 0;
    this.isBackgrounded = false;

    Sentry.logger.info("[SocketHealth] Socket health monitoring stopped");
  }

  markEventReceived(): void {
    this.trackEvent();
  }

  isHealthy(): boolean {
    if (!this.context || !this.isMonitoring) {
      return true;
    }

    const socket = this.context.socket;
    if (!socket.connected) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastEvent = now - this.lastEventTimestamp;

    return timeSinceLastEvent < SOCKET_SILENCE_THRESHOLD_MS || this.lastEventTimestamp === 0;
  }
}

export const socketHealthMonitor = new SocketHealthMonitor();
