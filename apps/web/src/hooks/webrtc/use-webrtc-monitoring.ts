"use client";

import * as Sentry from "@sentry/nextjs";

import { useCallback, useRef } from "react";
import { NetworkMonitor, type NetworkQuality } from "@/lib/webrtc/network-monitor";
import { VideoHealthTracker } from "@/lib/webrtc/video-health-tracker";
import { QualityController } from "@/lib/webrtc/quality-controller";
import { applyInitialEncoding, type QualityTier } from "@/lib/webrtc/adaptive-encoding";

export interface MonitoringCallbacks {
  onNetworkQualityChange: (quality: NetworkQuality) => void;
  onVideoStalled: (stalled: boolean) => void;
  onQualityTierChange: (tier: QualityTier) => void;
}

export interface UseWebRTCMonitoringReturn {
  initializeMonitoring: (pc: RTCPeerConnection, isMobile: boolean, callbacks: MonitoringCallbacks) => Promise<void>;
  stopMonitoring: () => void;
  getCurrentQuality: () => NetworkQuality;
  getCurrentTier: () => QualityTier;
  isVideoStalled: () => boolean;
}

export function useWebRTCMonitoring(): UseWebRTCMonitoringReturn {
  const networkMonitorRef = useRef<NetworkMonitor | null>(null);
  const videoHealthTrackerRef = useRef<VideoHealthTracker | null>(null);
  const qualityControllerRef = useRef<QualityController | null>(null);

  const initializeMonitoring = useCallback(
    async (pc: RTCPeerConnection, isMobile: boolean, callbacks: MonitoringCallbacks): Promise<void> => {
      stopMonitoring();

      await applyInitialEncoding(pc, isMobile);

      const networkMonitor = new NetworkMonitor();
      const videoHealthTracker = new VideoHealthTracker();
      const qualityController = new QualityController();

      networkMonitor.startMonitoring(pc, {
        onQualityChange: (quality: NetworkQuality) => {
          callbacks.onNetworkQualityChange(quality);
          qualityController.onNetworkQualityChange(quality);
        },
        onNetworkDegraded: () => {
          qualityController.onNetworkDegraded();
        },
        onNetworkRecovered: () => {
          qualityController.onNetworkRecovered();
        },
      });

      videoHealthTracker.startTracking(pc, {
        onVideoStalled: () => {
          callbacks.onVideoStalled(true);
          qualityController.onVideoStalled();
        },
        onVideoRecovered: () => {
          callbacks.onVideoStalled(false);
          qualityController.onVideoRecovered();
        },
        onFrameRateChange: (fps: number) => {
          Sentry.logger.info("Frame rate", { fps });
        },
      });

      qualityController.initialize(pc, networkMonitor, videoHealthTracker, {
        onQualityTierChange: callbacks.onQualityTierChange,
        onNetworkQualityChange: callbacks.onNetworkQualityChange,
        onVideoStalled: callbacks.onVideoStalled,
      }, isMobile);

      networkMonitorRef.current = networkMonitor;
      videoHealthTrackerRef.current = videoHealthTracker;
      qualityControllerRef.current = qualityController;

      Sentry.logger.info("Initialized monitoring services");
    },
    []
  );

  const stopMonitoring = useCallback(() => {
    if (qualityControllerRef.current) {
      qualityControllerRef.current.destroy();
      qualityControllerRef.current = null;
    }

    if (networkMonitorRef.current) {
      networkMonitorRef.current.stopMonitoring();
      networkMonitorRef.current = null;
    }

    if (videoHealthTrackerRef.current) {
      videoHealthTrackerRef.current.stopTracking();
      videoHealthTrackerRef.current = null;
    }

    Sentry.logger.info("Stopped monitoring services");
  }, []);

  const getCurrentQuality = useCallback((): NetworkQuality => {
    return networkMonitorRef.current?.getNetworkQuality() ?? "excellent";
  }, []);

  const getCurrentTier = useCallback((): QualityTier => {
    return qualityControllerRef.current?.getCurrentTier() ?? "high";
  }, []);

  const isVideoStalled = useCallback((): boolean => {
    return videoHealthTrackerRef.current?.isVideoStalled() ?? false;
  }, []);

  return {
    initializeMonitoring,
    stopMonitoring,
    getCurrentQuality,
    getCurrentTier,
    isVideoStalled,
  };
}
