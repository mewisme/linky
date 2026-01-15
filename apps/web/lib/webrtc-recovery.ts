import { logger } from "@/utils/logger";

export type RecoveryTier = "none" | "resume-media" | "ice-restart" | "forced-relay";

export interface RecoveryStats {
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  timestamp: number;
  audioBytesSent?: number;
  videoBytesSent?: number;
  audioBytesReceived?: number;
  videoBytesReceived?: number;
}

export interface RecoveryContext {
  pc: RTCPeerConnection;
  isOfferer: boolean;
  onIceRestart: (offer: RTCSessionDescriptionInit, useRelay: boolean) => Promise<void>;
  getIceServers: () => Promise<RTCIceServer[]>;
  onRecoveryStateChange?: (tier: RecoveryTier) => void;
  recordIceRestart?: () => boolean;
}

const GRACE_PERIOD_MS = 1000;
const STATS_INTERVAL_MS = 2000;
const STATS_INTERVAL_HEALTHY_MS = 4000;
const RECOVERY_COOLDOWN_MS = 5000;
const MIN_BYTES_THRESHOLD = 100;

class RecoveryController {
  private recoveryInProgress = false;
  private lastRecoveryAttempt = 0;
  private currentTier: RecoveryTier = "none";
  private statsInterval: NodeJS.Timeout | null = null;
  private lastStats: RecoveryStats | null = null;
  private networkChangeDetected = false;
  private iceRestartCompletedAt = 0;
  private context: RecoveryContext | null = null;

  private async getRtpStats(pc: RTCPeerConnection): Promise<RecoveryStats | null> {
    try {
      const stats = await pc.getStats();
      let bytesSent = 0;
      let bytesReceived = 0;
      let packetsSent = 0;
      let packetsReceived = 0;
      let audioBytesSent = 0;
      let videoBytesSent = 0;
      let audioBytesReceived = 0;
      let videoBytesReceived = 0;

      for (const report of stats.values()) {
        if (report.type === "outbound-rtp" && report.bytesSent !== undefined) {
          const bytes = report.bytesSent;
          bytesSent += bytes;
          packetsSent += (report.packetsSent || 0);

          const mediaType = (report as any).mediaType || (report as any).kind;
          if (mediaType === "audio") {
            audioBytesSent += bytes;
          } else if (mediaType === "video") {
            videoBytesSent += bytes;
          }
        }
        if (report.type === "inbound-rtp" && report.bytesReceived !== undefined) {
          const bytes = report.bytesReceived;
          bytesReceived += bytes;
          packetsReceived += (report.packetsReceived || 0);

          const mediaType = (report as any).mediaType || (report as any).kind;
          if (mediaType === "audio") {
            audioBytesReceived += bytes;
          } else if (mediaType === "video") {
            videoBytesReceived += bytes;
          }
        }
      }

      return {
        bytesSent,
        bytesReceived,
        packetsSent,
        packetsReceived,
        timestamp: Date.now(),
        audioBytesSent,
        videoBytesSent,
        audioBytesReceived,
        videoBytesReceived,
      };
    } catch (err) {
      logger.warn("Failed to get RTP stats:", err);
      return null;
    }
  }

  private getMediaTrackState(pc: RTCPeerConnection): {
    audioOutboundActive: boolean;
    videoOutboundActive: boolean;
    audioInboundExpected: boolean;
    videoInboundExpected: boolean;
  } {
    const senders = pc.getSenders();
    const transceivers = pc.getTransceivers();

    let audioOutboundActive = false;
    let videoOutboundActive = false;
    let audioInboundExpected = false;
    let videoInboundExpected = false;

    for (const sender of senders) {
      if (sender.track) {
        const track = sender.track;
        const isEnabled = track.enabled && track.readyState === "live";
        const kind = track.kind;

        if (kind === "audio" && isEnabled) {
          audioOutboundActive = true;
        } else if (kind === "video" && isEnabled) {
          videoOutboundActive = true;
        }
      }
    }

    for (const transceiver of transceivers) {
      const direction = transceiver.direction;
      const currentDirection = transceiver.currentDirection;
      const kind = transceiver.receiver.track?.kind || transceiver.sender.track?.kind;

      const isReceiving = direction === "sendrecv" || direction === "recvonly" ||
        currentDirection === "sendrecv" || currentDirection === "recvonly";

      if (kind === "audio" && isReceiving) {
        audioInboundExpected = true;
      } else if (kind === "video" && isReceiving) {
        videoInboundExpected = true;
      }
    }

    return {
      audioOutboundActive,
      videoOutboundActive,
      audioInboundExpected,
      videoInboundExpected,
    };
  }


  private async isMediaUnhealthy(stats: RecoveryStats, previousStats: RecoveryStats | null): Promise<boolean> {
    if (!previousStats || !this.context) {
      return false;
    }

    const timeDelta = stats.timestamp - previousStats.timestamp;
    if (timeDelta < GRACE_PERIOD_MS) {
      return false;
    }

    const pc = this.context.pc;
    const trackState = this.getMediaTrackState(pc);

    if (!trackState.audioOutboundActive && !trackState.videoOutboundActive) {
      logger.info("[Recovery] All outbound tracks intentionally inactive - suppressing recovery");
      return false;
    }

    const bytesSentDelta = stats.bytesSent - previousStats.bytesSent;
    const bytesReceivedDelta = stats.bytesReceived - previousStats.bytesReceived;

    const audioBytesSentDelta = (stats.audioBytesSent || 0) - (previousStats.audioBytesSent || 0);
    const videoBytesSentDelta = (stats.videoBytesSent || 0) - (previousStats.videoBytesSent || 0);
    const audioBytesReceivedDelta = (stats.audioBytesReceived || 0) - (previousStats.audioBytesReceived || 0);
    const videoBytesReceivedDelta = (stats.videoBytesReceived || 0) - (previousStats.videoBytesReceived || 0);

    const audioOutboundStalled = trackState.audioOutboundActive && audioBytesSentDelta < MIN_BYTES_THRESHOLD;
    const videoOutboundStalled = trackState.videoOutboundActive && videoBytesSentDelta < MIN_BYTES_THRESHOLD;
    const audioInboundStalled = trackState.audioInboundExpected && audioBytesReceivedDelta < MIN_BYTES_THRESHOLD;
    const videoInboundStalled = trackState.videoInboundExpected && videoBytesReceivedDelta < MIN_BYTES_THRESHOLD;

    const hasNoOutbound = bytesSentDelta < MIN_BYTES_THRESHOLD;
    const hasNoInbound = bytesReceivedDelta < MIN_BYTES_THRESHOLD;

    const outboundStalled = (trackState.audioOutboundActive || trackState.videoOutboundActive) && hasNoOutbound;
    const inboundStalled = (trackState.audioInboundExpected || trackState.videoInboundExpected) && hasNoInbound;

    const isOneWay = (outboundStalled && !inboundStalled) || (!outboundStalled && inboundStalled);

    const iceState = pc.iceConnectionState;
    const connectionState = pc.connectionState;

    const iceConnectedButStalled =
      (iceState === "connected" || iceState === "completed") &&
      connectionState === "connected" &&
      (outboundStalled || inboundStalled);

    const iceRestartCompletedButStalled =
      this.iceRestartCompletedAt > 0 &&
      Date.now() - this.iceRestartCompletedAt < GRACE_PERIOD_MS * 3 &&
      (outboundStalled || inboundStalled);

    const isUnhealthy = isOneWay || iceConnectedButStalled || iceRestartCompletedButStalled || this.networkChangeDetected;

    if (isUnhealthy) {
      logger.warn("[Recovery] Media unhealthy detected:", {
        audioOutboundActive: trackState.audioOutboundActive,
        videoOutboundActive: trackState.videoOutboundActive,
        audioOutboundStalled,
        videoOutboundStalled,
        audioInboundStalled,
        videoInboundStalled,
      });
    }

    return isUnhealthy;
  }

  private async tier1ResumeMedia(): Promise<boolean> {
    const pc = this.context?.pc;
    if (!pc) return false;

    try {
      const senders = pc.getSenders();
      let resumed = false;

      for (const sender of senders) {
        if (sender.track && sender.track.readyState === "live") {
          await sender.replaceTrack(sender.track);
          resumed = true;
        }
      }

      if (resumed) {
        logger.info("[Recovery] Tier 1: Media resume attempted via replaceTrack");
        await new Promise((resolve) => setTimeout(resolve, 500));

        // PATCH 4: Safari/iOS replaceTrack reliability - perform second replaceTrack for Safari/iOS
        const isSafariIOS = typeof navigator !== "undefined" &&
          (/^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
            /iPad|iPhone|iPod/.test(navigator.userAgent));
        if (isSafariIOS) {
          await new Promise((resolve) => setTimeout(resolve, 75));
          for (const sender of senders) {
            if (sender.track && sender.track.readyState === "live") {
              await sender.replaceTrack(sender.track);
            }
          }
          logger.info("[Recovery] Tier 1: Second replaceTrack for Safari/iOS");
        }

        return true;
      }
    } catch (err) {
      logger.warn("[Recovery] Tier 1 failed:", err);
    }

    return false;
  }

  private async tier2IceRestart(): Promise<boolean> {
    if (!this.context?.isOfferer) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastRecoveryAttempt < RECOVERY_COOLDOWN_MS) {
      return false;
    }

    if (this.context.recordIceRestart && !this.context.recordIceRestart()) {
      logger.warn("[Recovery] Tier 2: ICE restart limit exceeded, skipping");
      return false;
    }

    try {
      logger.info("[Recovery] Tier 2: Initiating ICE restart");
      this.lastRecoveryAttempt = now;

      const iceServers = await this.context.getIceServers();
      const currentConfig = this.context.pc.getConfiguration();

      if (JSON.stringify(currentConfig.iceServers) === JSON.stringify(iceServers)) {
        logger.info("[Recovery] Tier 2: ICE servers unchanged, skipping setConfiguration");
      } else {
        await this.context.pc.setConfiguration({
          iceServers,
          iceCandidatePoolSize: currentConfig.iceCandidatePoolSize,
        });
      }

      const offer = await this.context.pc.createOffer({ iceRestart: true });
      await this.context.pc.setLocalDescription(offer);

      await this.context.onIceRestart(offer, false);

      this.iceRestartCompletedAt = Date.now();

      return true;
    } catch (err) {
      logger.warn("[Recovery] Tier 2 failed:", err);
      return false;
    }
  }

  private async tier3ForcedRelay(): Promise<boolean> {
    if (!this.context?.isOfferer) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastRecoveryAttempt < RECOVERY_COOLDOWN_MS) {
      return false;
    }

    if (this.context.recordIceRestart && !this.context.recordIceRestart()) {
      logger.warn("[Recovery] Tier 3: ICE restart limit exceeded, forcing teardown");
      this.context.onRecoveryStateChange?.("none");
      return false;
    }

    try {
      logger.info("[Recovery] Tier 3: Forcing relay-only ICE restart");
      this.lastRecoveryAttempt = now;

      const iceServers = await this.context.getIceServers();
      const currentConfig = this.context.pc.getConfiguration();

      await this.context.pc.setConfiguration({
        iceServers,
        iceTransportPolicy: "relay",
        iceCandidatePoolSize: currentConfig.iceCandidatePoolSize,
      });

      const offer = await this.context.pc.createOffer({ iceRestart: true });
      await this.context.pc.setLocalDescription(offer);

      await this.context.onIceRestart(offer, true);

      this.iceRestartCompletedAt = Date.now();

      await new Promise((resolve) => setTimeout(resolve, GRACE_PERIOD_MS * 2));
      const verifyStats = await this.getRtpStats(this.context.pc);

      // PATCH 3: Return true ONLY if media health verification passes
      if (verifyStats && !(await this.isMediaUnhealthy(verifyStats, this.lastStats))) {
        logger.info("[Recovery] Tier 3 succeeded, resetting transport policy");
        try {
          await this.context.pc.setConfiguration({
            iceServers,
            iceTransportPolicy: "all",
            iceCandidatePoolSize: this.context.pc.getConfiguration().iceCandidatePoolSize,
          });
        } catch (err) {
          logger.warn("[Recovery] Failed to reset transport policy:", err);
        }
        return true;
      }

      logger.warn("[Recovery] Tier 3: Media remains unhealthy after forced relay");
      return false;
    } catch (err) {
      logger.error("[Recovery] Tier 3 failed (final attempt):", err);
      return false;
    }
  }

  private async attemptRecovery(): Promise<void> {
    if (this.recoveryInProgress) {
      return;
    }

    if (!this.context) {
      return;
    }

    const pc = this.context.pc;
    if (pc.signalingState === "closed" || pc.connectionState === "closed" || pc.connectionState === "failed") {
      this.stop();
      return;
    }

    this.recoveryInProgress = true;

    try {
      const stats = await this.getRtpStats(pc);
      if (!stats) {
        this.recoveryInProgress = false;
        return;
      }

      if (!(await this.isMediaUnhealthy(stats, this.lastStats))) {
        if (this.currentTier !== "none") {
          logger.info("[Recovery] Media recovered, resetting tier");
          this.currentTier = "none";
          this.networkChangeDetected = false;
          this.context?.onRecoveryStateChange?.("none");
          // PATCH 5: Switch to slower interval when healthy
          this.updateStatsInterval();
        }
        this.lastStats = stats;
        this.recoveryInProgress = false;
        return;
      }

      // PATCH 5: Switch to faster interval when recovery is needed
      if (this.currentTier === "none") {
        this.updateStatsInterval();
      }

      const reason = this.networkChangeDetected
        ? "network change"
        : this.iceRestartCompletedAt > 0
          ? "ICE restart completed but RTP stalled"
          : stats.bytesSent - (this.lastStats?.bytesSent || 0) < MIN_BYTES_THRESHOLD &&
            stats.bytesReceived - (this.lastStats?.bytesReceived || 0) < MIN_BYTES_THRESHOLD
            ? "bidirectional RTP stall"
            : "one-way media";

      const trackState = this.getMediaTrackState(pc);
      if (!trackState.audioOutboundActive && !trackState.videoOutboundActive) {
        logger.info("[Recovery] All tracks intentionally inactive - suppressing recovery");
        this.lastStats = stats;
        this.recoveryInProgress = false;
        return;
      }

      logger.warn(`[Recovery] Triggered: ${reason}`);

      if (this.currentTier === "none") {
        const resumed = await this.tier1ResumeMedia();
        if (resumed) {
          this.currentTier = "resume-media";
          await new Promise((resolve) => setTimeout(resolve, GRACE_PERIOD_MS));
          await new Promise((resolve) => setTimeout(resolve, GRACE_PERIOD_MS));
          const verifyStats = await this.getRtpStats(pc);
          if (verifyStats && !(await this.isMediaUnhealthy(verifyStats, stats))) {
            logger.info("[Recovery] Tier 1 succeeded");
            this.currentTier = "none";
            this.networkChangeDetected = false;
            this.lastStats = verifyStats;
            this.context?.onRecoveryStateChange?.("none");
            // PATCH 5: Switch to slower interval when recovery succeeds
            this.updateStatsInterval();
            this.recoveryInProgress = false;
            return;
          }
        }
        this.currentTier = "ice-restart";
        this.context?.onRecoveryStateChange?.("ice-restart");
      }

      if (this.currentTier === "ice-restart") {
        const restarted = await this.tier2IceRestart();
        if (restarted) {
          await new Promise((resolve) => setTimeout(resolve, GRACE_PERIOD_MS * 2));
          const verifyStats = await this.getRtpStats(pc);
          if (verifyStats && !(await this.isMediaUnhealthy(verifyStats, this.lastStats))) {
            logger.info("[Recovery] Tier 2 succeeded, media recovered");
            this.currentTier = "none";
            this.networkChangeDetected = false;
            this.lastStats = verifyStats;
            this.context?.onRecoveryStateChange?.("none");
            this.updateStatsInterval();
            this.recoveryInProgress = false;
            return;
          }
          this.currentTier = "forced-relay";
          this.context?.onRecoveryStateChange?.("forced-relay");
          return;
        } else {
          this.currentTier = "none";
          this.context?.onRecoveryStateChange?.("none");
        }
      }

      if (this.currentTier === "forced-relay") {
        await this.tier3ForcedRelay();
        this.currentTier = "none";
        this.context?.onRecoveryStateChange?.("none");
      }
    } catch (err) {
      logger.error("[Recovery] Recovery attempt failed:", err);
    } finally {
      this.recoveryInProgress = false;
    }
  }

  start(context: RecoveryContext): void {
    if (this.statsInterval) {
      this.stop();
    }

    this.context = context;
    this.currentTier = "none";
    this.recoveryInProgress = false;
    this.lastStats = null;
    this.networkChangeDetected = false;
    this.iceRestartCompletedAt = 0;

    const pc = context.pc;

    // PATCH 1: Removed iceconnectionstatechange listener that set iceRestartCompletedAt
    // iceRestartCompletedAt is now set only when controller explicitly triggers ICE restart

    if (typeof window !== "undefined" && "connection" in navigator) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        connection.addEventListener("change", () => {
          this.networkChangeDetected = true;
          logger.info("[Recovery] Network change detected");
        });
      }
    }

    // PATCH 5: Adaptive stats interval - faster when recovering, slower when healthy
    this.updateStatsInterval();

    logger.info("[Recovery] Recovery controller started");
  }

  private updateStatsInterval(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    const interval = this.currentTier === "none" ? STATS_INTERVAL_HEALTHY_MS : STATS_INTERVAL_MS;
    this.statsInterval = setInterval(() => {
      this.attemptRecovery();
    }, interval);
  }

  stop(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.context = null;
    this.recoveryInProgress = false;
    this.currentTier = "none";
    this.lastStats = null;
    this.networkChangeDetected = false;
    logger.info("[Recovery] Recovery controller stopped");
  }

  markIceRestartComplete(): void {
    this.iceRestartCompletedAt = Date.now();
  }

  getCurrentTier(): RecoveryTier {
    return this.currentTier;
  }
}

export const recoveryController = new RecoveryController();
