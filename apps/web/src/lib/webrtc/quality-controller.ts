import * as Sentry from "@sentry/nextjs";

import {
  applyEncodingToSender,
  degradeQuality,
  getEncodingParamsForTier,
  restoreQuality,
  type QualityTier,
} from "./adaptive-encoding";
import { NetworkMonitor, type NetworkQuality } from "./network-monitor";
import { VideoHealthTracker } from "./video-health-tracker";

export interface QualityControllerCallbacks {
  onQualityTierChange: (tier: QualityTier) => void;
  onNetworkQualityChange: (quality: NetworkQuality) => void;
  onVideoStalled: (stalled: boolean) => void;
}

const DEGRADATION_DELAY_MS = 5000;
const RECOVERY_DELAY_MS = 10000;
const MAX_DEGRADATION_STEPS = 3;

export class QualityController {
  private pc: RTCPeerConnection | null = null;
  private networkMonitor: NetworkMonitor | null = null;
  private videoHealthTracker: VideoHealthTracker | null = null;
  private callbacks: QualityControllerCallbacks | null = null;
  private isMobile = false;
  private isInitialized = false;
  private isBackgrounded = false;

  private currentTier: QualityTier = "high";
  private degradationSteps = 0;
  private degradationTimeoutId: number | null = null;
  private recoveryTimeoutId: number | null = null;
  private visibilityChangeHandler: (() => void) | null = null;

  initialize(
    pc: RTCPeerConnection,
    networkMonitor: NetworkMonitor,
    videoHealthTracker: VideoHealthTracker,
    callbacks: QualityControllerCallbacks,
    isMobile: boolean
  ): void {
    if (this.isInitialized) {
      Sentry.logger.warn("[QualityController] Already initialized");
      return;
    }

    this.pc = pc;
    this.networkMonitor = networkMonitor;
    this.videoHealthTracker = videoHealthTracker;
    this.callbacks = callbacks;
    this.isMobile = isMobile;
    this.isInitialized = true;
    this.currentTier = "high";
    this.degradationSteps = 0;

    this.setupVisibilityListener();

    Sentry.logger.info("[QualityController] Initialized with mobile", { isMobile });
  }

  destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    this.clearDegradationTimeout();
    this.clearRecoveryTimeout();
    this.removeVisibilityListener();

    this.pc = null;
    this.networkMonitor = null;
    this.videoHealthTracker = null;
    this.callbacks = null;
    this.isInitialized = false;
    this.currentTier = "high";
    this.degradationSteps = 0;

    Sentry.logger.info("[QualityController] Destroyed");
  }

  onNetworkDegraded(): void {
    if (!this.isInitialized || this.isBackgrounded) {
      return;
    }

    this.clearRecoveryTimeout();

    if (this.degradationTimeoutId !== null) {
      return;
    }

    this.degradationTimeoutId = window.setTimeout(() => {
      this.degradeVideoQuality();
      this.degradationTimeoutId = null;
    }, DEGRADATION_DELAY_MS);

    Sentry.logger.info("[QualityController] Network degradation detected, scheduled quality reduction");
  }

  onNetworkRecovered(): void {
    if (!this.isInitialized || this.isBackgrounded) {
      return;
    }

    this.clearDegradationTimeout();

    if (this.recoveryTimeoutId !== null) {
      return;
    }

    this.recoveryTimeoutId = window.setTimeout(() => {
      this.restoreVideoQuality();
      this.recoveryTimeoutId = null;
    }, RECOVERY_DELAY_MS);

    Sentry.logger.info("[QualityController] Network recovery detected, scheduled quality restoration");
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

  async forceMinimalQuality(): Promise<void> {
    if (!this.isInitialized || !this.pc) {
      return;
    }

    const newTier = "minimal";
    if (newTier === this.currentTier) {
      return;
    }

    await this.applyQualityTier(newTier);
    Sentry.logger.warn("[QualityController] Forced minimal quality");
  }

  private async degradeVideoQuality(): Promise<void> {
    if (!this.isInitialized || !this.pc) {
      return;
    }

    if (this.degradationSteps >= MAX_DEGRADATION_STEPS) {
      Sentry.logger.warn("[QualityController] Maximum degradation steps reached");
      return;
    }

    const newTier = degradeQuality(this.currentTier);
    if (newTier === this.currentTier) {
      return;
    }

    await this.applyQualityTier(newTier);
    this.degradationSteps++;

    Sentry.logger.warn("[QualityController] Degraded video quality", { tier: newTier, steps: this.degradationSteps });
  }

  private async restoreVideoQuality(): Promise<void> {
    if (!this.isInitialized || !this.pc) {
      return;
    }

    if (this.degradationSteps === 0) {
      return;
    }

    const newTier = restoreQuality(this.currentTier);
    if (newTier === this.currentTier) {
      return;
    }

    await this.applyQualityTier(newTier);
    this.degradationSteps = Math.max(0, this.degradationSteps - 1);

    Sentry.logger.info("[QualityController] Restored video quality", { tier: newTier, steps: this.degradationSteps });
  }

  private async applyQualityTier(tier: QualityTier): Promise<void> {
    if (!this.pc) {
      return;
    }

    const params = getEncodingParamsForTier(tier, this.isMobile);
    const senders = this.pc.getSenders();

    for (const sender of senders) {
      if (sender.track?.kind === "video") {
        const success = await applyEncodingToSender(sender, params);
        if (success) {
          this.currentTier = tier;
          if (this.callbacks) {
            this.callbacks.onQualityTierChange(tier);
          }
        }
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
        Sentry.logger.info("[QualityController] App foregrounded - resuming quality control");
        this.onAppForegrounded();
      } else if (!wasBackgrounded && this.isBackgrounded) {
        Sentry.logger.info("[QualityController] App backgrounded - pausing quality adjustments");
        this.onAppBackgrounded();
      }
    };

    document.addEventListener("visibilitychange", this.visibilityChangeHandler);
  }

  private removeVisibilityListener(): void {
    if (this.visibilityChangeHandler && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    this.isBackgrounded = false;
  }

  private onAppBackgrounded(): void {
    this.clearDegradationTimeout();
    this.clearRecoveryTimeout();

    if (this.isMobile && this.currentTier !== "minimal") {
      this.forceMinimalQuality();
    }
  }

  private onAppForegrounded(): void {
    if (!this.networkMonitor) {
      return;
    }

    const quality = this.networkMonitor.getNetworkQuality();
    const isGood = quality === "excellent" || quality === "good";

    if (isGood && this.degradationSteps > 0) {
      this.onNetworkRecovered();
    }
  }

  private clearDegradationTimeout(): void {
    if (this.degradationTimeoutId !== null) {
      window.clearTimeout(this.degradationTimeoutId);
      this.degradationTimeoutId = null;
    }
  }

  private clearRecoveryTimeout(): void {
    if (this.recoveryTimeoutId !== null) {
      window.clearTimeout(this.recoveryTimeoutId);
      this.recoveryTimeoutId = null;
    }
  }
}
