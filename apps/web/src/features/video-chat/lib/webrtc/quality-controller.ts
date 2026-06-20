import * as Sentry from "@sentry/nextjs";

import {
  applyEncodingToSender,
  getEncodingParamsForStreamQuality,
  type QualityTier,
} from "./adaptive-encoding";
import type { StreamVideoQuality } from "@/entities/user/lib/user-settings-preferences";
import { NetworkMonitor, type NetworkQuality } from "./network-monitor";
import { VideoHealthTracker } from "./video-health-tracker";

export interface QualityControllerCallbacks {
  onQualityTierChange: (tier: QualityTier) => void;
  onNetworkQualityChange: (quality: NetworkQuality) => void;
  onVideoStalled: (stalled: boolean) => void;
}

export class QualityController {
  private pc: RTCPeerConnection | null = null;
  private networkMonitor: NetworkMonitor | null = null;
  private videoHealthTracker: VideoHealthTracker | null = null;
  private callbacks: QualityControllerCallbacks | null = null;
  private isInitialized = false;
  private isBackgrounded = false;
  private streamQuality: StreamVideoQuality = "sd";

  private currentTier: QualityTier = "high";
  private visibilityChangeHandler: (() => void) | null = null;

  initialize(
    pc: RTCPeerConnection,
    networkMonitor: NetworkMonitor,
    videoHealthTracker: VideoHealthTracker,
    callbacks: QualityControllerCallbacks,
    _isMobile: boolean,
    streamQuality: StreamVideoQuality = "sd",
  ): void {
    if (this.isInitialized) {
      Sentry.logger.warn("[QualityController] Already initialized");
      return;
    }

    this.pc = pc;
    this.networkMonitor = networkMonitor;
    this.videoHealthTracker = videoHealthTracker;
    this.callbacks = callbacks;
    this.isInitialized = true;
    this.currentTier = "high";
    this.streamQuality = streamQuality;

    this.setupVisibilityListener();

    Sentry.logger.info("[QualityController] Initialized", {
      streamQuality,
    });
  }

  async setStreamQuality(quality: StreamVideoQuality): Promise<void> {
    if (this.streamQuality === quality) {
      return;
    }

    this.streamQuality = quality;

    if (!this.pc) {
      return;
    }

    await this.applyEncoding(getEncodingParamsForStreamQuality(quality));
  }

  getStreamQuality(): StreamVideoQuality {
    return this.streamQuality;
  }

  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    this.removeVisibilityListener();

    this.pc = null;
    this.networkMonitor = null;
    this.videoHealthTracker = null;
    this.callbacks = null;
    this.isInitialized = false;
    this.currentTier = "high";

    Sentry.logger.info("[QualityController] Destroyed");
  }

  onNetworkDegraded(): void {
    return;
  }

  onNetworkRecovered(): void {
    return;
  }

  onNetworkQualityChange(quality: NetworkQuality): void {
    if (!this.callbacks) {
      return;
    }

    this.callbacks.onNetworkQualityChange(quality);
  }

  onVideoStalled(): void {
    if (!this.callbacks || this.isBackgrounded) {
      return;
    }

    this.callbacks.onVideoStalled(true);
  }

  onVideoRecovered(): void {
    if (!this.callbacks || this.isBackgrounded) {
      return;
    }

    this.callbacks.onVideoStalled(false);
  }

  getCurrentTier(): QualityTier {
    return this.currentTier;
  }

  private async applyEncoding(params: {
    maxBitrate: number;
    maxFramerate: number;
    scaleResolutionDownBy: number;
  }): Promise<void> {
    if (!this.pc) {
      return;
    }
    const senders = this.pc.getSenders();
    for (const sender of senders) {
      if (sender.track?.kind === "video") {
        await applyEncodingToSender(sender, params);
      }
    }
  }

  private setupVisibilityListener(): void {
    if (typeof document === "undefined") {
      return;
    }

    this.isBackgrounded = document.hidden;

    this.visibilityChangeHandler = () => {
      const wasBackgrounded = this.isBackgrounded;
      this.isBackgrounded = document.hidden;

      if (wasBackgrounded && !this.isBackgrounded) {
        Sentry.logger.info("[QualityController] App foregrounded");
      } else if (!wasBackgrounded && this.isBackgrounded) {
        Sentry.logger.info("[QualityController] App backgrounded");
      }
    };

    document.addEventListener("visibilitychange", this.visibilityChangeHandler);
  }

  private removeVisibilityListener(): void {
    if (this.visibilityChangeHandler && typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityChangeHandler,
      );
      this.visibilityChangeHandler = null;
    }
    this.isBackgrounded = false;
  }
}
