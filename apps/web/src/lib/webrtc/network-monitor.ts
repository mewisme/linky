export type NetworkQuality = "excellent" | "good" | "poor" | "critical";

export interface NetworkMetrics {
  rtt: number;
  packetLoss: number;
  jitter: number;
  timestamp: number;
}

export interface NetworkMonitorCallbacks {
  onQualityChange: (quality: NetworkQuality) => void;
  onNetworkDegraded: () => void;
  onNetworkRecovered: () => void;
}

const POLL_INTERVAL_MS = 2000;
const RTT_THRESHOLD_MS = 150;
const PACKET_LOSS_THRESHOLD = 0.03;
const DEGRADATION_WINDOW_MS = 5000;
const RECOVERY_WINDOW_MS = 10000;

export class NetworkMonitor {
  private pc: RTCPeerConnection | null = null;
  private callbacks: NetworkMonitorCallbacks | null = null;
  private intervalId: number | null = null;
  private currentQuality: NetworkQuality = "excellent";
  private degradationStartTime: number | null = null;
  private recoveryStartTime: number | null = null;
  private lastMetrics: NetworkMetrics | null = null;
  private isRunning = false;

  startMonitoring(
    pc: RTCPeerConnection,
    callbacks: NetworkMonitorCallbacks
  ): void {
    if (this.isRunning) {
      console.warn("[NetworkMonitor] Already monitoring");
      return;
    }

    this.pc = pc;
    this.callbacks = callbacks;
    this.isRunning = true;
    this.currentQuality = "excellent";
    this.degradationStartTime = null;
    this.recoveryStartTime = null;

    this.intervalId = window.setInterval(() => {
      this.checkNetworkConditions();
    }, POLL_INTERVAL_MS);

    console.info("[NetworkMonitor] Started monitoring");
  }

  stopMonitoring(): void {
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
    this.degradationStartTime = null;
    this.recoveryStartTime = null;
    this.lastMetrics = null;

    console.info("[NetworkMonitor] Stopped monitoring");
  }

  getNetworkQuality(): NetworkQuality {
    return this.currentQuality;
  }

  private async checkNetworkConditions(): Promise<void> {
    if (!this.pc || !this.callbacks) {
      return;
    }

    try {
      const metrics = await this.collectMetrics(this.pc);
      if (!metrics) {
        return;
      }

      this.lastMetrics = metrics;

      const quality = this.assessQuality(metrics);
      this.handleQualityChange(quality, metrics);
    } catch (err) {
      console.warn("[NetworkMonitor] Failed to check network conditions:", err);
    }
  }

  private async collectMetrics(
    pc: RTCPeerConnection
  ): Promise<NetworkMetrics | null> {
    try {
      const stats = await pc.getStats();
      let rtt = 0;
      let packetsLost = 0;
      let packetsReceived = 0;
      let jitter = 0;
      let rttCount = 0;
      let jitterCount = 0;

      for (const report of stats.values()) {
        if (report.type === "remote-inbound-rtp") {
          if (typeof report.roundTripTime === "number") {
            rtt += report.roundTripTime * 1000;
            rttCount++;
          }
          if (typeof report.jitter === "number") {
            jitter += report.jitter * 1000;
            jitterCount++;
          }
        }

        if (report.type === "inbound-rtp") {
          if (typeof report.packetsLost === "number") {
            packetsLost += report.packetsLost;
          }
          if (typeof report.packetsReceived === "number") {
            packetsReceived += report.packetsReceived;
          }
          if (typeof report.jitter === "number" && jitterCount === 0) {
            jitter += report.jitter * 1000;
            jitterCount++;
          }
        }
      }

      const avgRtt = rttCount > 0 ? rtt / rttCount : 0;
      const avgJitter = jitterCount > 0 ? jitter / jitterCount : 0;
      const totalPackets = packetsLost + packetsReceived;
      const packetLoss = totalPackets > 0 ? packetsLost / totalPackets : 0;

      return {
        rtt: avgRtt,
        packetLoss,
        jitter: avgJitter,
        timestamp: Date.now(),
      };
    } catch (err) {
      console.warn("[NetworkMonitor] Failed to collect metrics:", err);
      return null;
    }
  }

  private assessQuality(metrics: NetworkMetrics): NetworkQuality {
    const rttMs = metrics.rtt;
    const lossPercent = metrics.packetLoss * 100;

    if (rttMs > 400 || lossPercent > 10) {
      return "critical";
    }

    if (rttMs > RTT_THRESHOLD_MS || lossPercent > PACKET_LOSS_THRESHOLD * 100) {
      return "poor";
    }

    if (rttMs > 100 || lossPercent > 1) {
      return "good";
    }

    return "excellent";
  }

  private handleQualityChange(
    newQuality: NetworkQuality,
    metrics: NetworkMetrics
  ): void {
    if (!this.callbacks) {
      return;
    }

    const isDegraded = newQuality === "poor" || newQuality === "critical";
    const wasGood =
      this.currentQuality === "excellent" || this.currentQuality === "good";
    const isGood = newQuality === "excellent" || newQuality === "good";
    const wasDegraded =
      this.currentQuality === "poor" || this.currentQuality === "critical";

    if (isDegraded && wasGood) {
      if (this.degradationStartTime === null) {
        this.degradationStartTime = Date.now();
      }

      const degradationDuration = Date.now() - this.degradationStartTime;

      if (degradationDuration >= DEGRADATION_WINDOW_MS) {
        console.warn(
          "[NetworkMonitor] Network degraded:",
          metrics,
          "Quality:",
          newQuality
        );
        this.callbacks.onNetworkDegraded();
        this.recoveryStartTime = null;
      }
    } else if (isGood && wasDegraded) {
      if (this.recoveryStartTime === null) {
        this.recoveryStartTime = Date.now();
      }

      const recoveryDuration = Date.now() - this.recoveryStartTime;

      if (recoveryDuration >= RECOVERY_WINDOW_MS) {
        console.info(
          "[NetworkMonitor] Network recovered:",
          metrics,
          "Quality:",
          newQuality
        );
        this.callbacks.onNetworkRecovered();
        this.degradationStartTime = null;
      }
    } else if (isDegraded) {
      this.recoveryStartTime = null;
    } else if (isGood) {
      this.degradationStartTime = null;
    }

    if (newQuality !== this.currentQuality) {
      this.currentQuality = newQuality;
      this.callbacks.onQualityChange(newQuality);
    }
  }

  getLastMetrics(): NetworkMetrics | null {
    return this.lastMetrics;
  }
}
