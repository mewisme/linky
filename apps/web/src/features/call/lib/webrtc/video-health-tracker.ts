import * as Sentry from "@sentry/nextjs";

export interface VideoHealthMetrics {
  framesReceived: number;
  framesDropped: number;
  frameRate: number;
  timestamp: number;
}

export interface VideoHealthCallbacks {
  onVideoStalled: () => void;
  onVideoRecovered: () => void;
  onFrameRateChange: (fps: number) => void;
}

const POLL_INTERVAL_MS = 2000;
const STALL_THRESHOLD_POLLS = 3;
const FRAME_RATE_WINDOW_MS = 2000;

export class VideoHealthTracker {
  private pc: RTCPeerConnection | null = null;
  private callbacks: VideoHealthCallbacks | null = null;
  private intervalId: number | null = null;
  private isRunning = false;
  private isStalled = false;
  private lastFramesReceived = 0;
  private lastFrameTimestamp = 0;
  private stallCount = 0;
  private currentFrameRate = 0;
  private lastMetrics: VideoHealthMetrics | null = null;

  startTracking(pc: RTCPeerConnection, callbacks: VideoHealthCallbacks): void {
    if (this.isRunning) {
      Sentry.logger.warn("[VideoHealthTracker] Already tracking");
      return;
    }

    this.pc = pc;
    this.callbacks = callbacks;
    this.isRunning = true;
    this.isStalled = false;
    this.lastFramesReceived = 0;
    this.lastFrameTimestamp = Date.now();
    this.stallCount = 0;
    this.currentFrameRate = 0;

    this.intervalId = window.setInterval(() => {
      this.checkVideoHealth();
    }, POLL_INTERVAL_MS);

    Sentry.logger.info("[VideoHealthTracker] Started tracking");
  }

  stopTracking(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.pc = null;
    this.callbacks = null;
    this.isRunning = false;
    this.isStalled = false;
    this.lastFramesReceived = 0;
    this.lastFrameTimestamp = 0;
    this.stallCount = 0;
    this.currentFrameRate = 0;
    this.lastMetrics = null;

    Sentry.logger.info("[VideoHealthTracker] Stopped tracking");
  }

  isVideoStalled(): boolean {
    return this.isStalled;
  }

  getFrameRate(): number {
    return this.currentFrameRate;
  }

  private async checkVideoHealth(): Promise<void> {
    if (!this.pc || !this.callbacks) {
      return;
    }

    try {
      const metrics = await this.collectVideoMetrics(this.pc);
      if (!metrics) {
        return;
      }

      this.lastMetrics = metrics;
      const prevFramesReceived = this.lastFramesReceived;
      this.detectStall(metrics);
      this.updateFrameRate(metrics, prevFramesReceived);
    } catch (err) {
      Sentry.logger.warn("[VideoHealthTracker] Failed to check video health", { error: err });
    }
  }

  private async collectVideoMetrics(
    pc: RTCPeerConnection
  ): Promise<VideoHealthMetrics | null> {
    try {
      const stats = await pc.getStats();
      let framesReceived = 0;
      let framesDropped = 0;

      for (const report of stats.values()) {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          if (typeof report.framesReceived === "number") {
            framesReceived = report.framesReceived;
          }
          if (typeof report.framesDropped === "number") {
            framesDropped = report.framesDropped;
          }
        }
      }

      return {
        framesReceived,
        framesDropped,
        frameRate: this.currentFrameRate,
        timestamp: Date.now(),
      };
    } catch (err) {
      Sentry.logger.warn("[VideoHealthTracker] Failed to collect video metrics", { error: err });
      return null;
    }
  }

  private detectStall(metrics: VideoHealthMetrics): void {
    if (!this.callbacks) {
      return;
    }

    const framesDelta = metrics.framesReceived - this.lastFramesReceived;

    if (framesDelta === 0) {
      this.stallCount++;

      if (this.stallCount >= STALL_THRESHOLD_POLLS && !this.isStalled) {
        this.isStalled = true;
        Sentry.logger.warn("[VideoHealthTracker] Video stalled detected");
        this.callbacks.onVideoStalled();
      }
    } else {
      this.stallCount = 0;

      if (this.isStalled) {
        this.isStalled = false;
        Sentry.logger.info("[VideoHealthTracker] Video recovered from stall");
        this.callbacks.onVideoRecovered();
      }
    }

    this.lastFramesReceived = metrics.framesReceived;
  }

  private updateFrameRate(metrics: VideoHealthMetrics, prevFramesReceived: number): void {
    if (!this.callbacks) {
      return;
    }

    const timeDelta = metrics.timestamp - this.lastFrameTimestamp;
    const framesDelta = metrics.framesReceived - prevFramesReceived;

    if (timeDelta >= FRAME_RATE_WINDOW_MS && framesDelta > 0) {
      const fps = (framesDelta / timeDelta) * 1000;
      this.currentFrameRate = Math.round(fps);

      this.callbacks.onFrameRateChange(this.currentFrameRate);
      this.lastFrameTimestamp = metrics.timestamp;
    }
  }

  getLastMetrics(): VideoHealthMetrics | null {
    return this.lastMetrics;
  }
}
