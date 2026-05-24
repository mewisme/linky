"use client";

import { useCallback, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { VideoFilterPipeline } from "@/features/call/lib/video-filter/video-filter-pipeline";

export interface UseVideoFilterPipelineReturn {
  processedStream: MediaStream | null;
  isFilterActive: boolean;
  setPreset: (fragmentShader: string | null) => boolean;
  start: (rawStream: MediaStream) => MediaStream;
  dispose: () => void;
}

export function useVideoFilterPipeline(): UseVideoFilterPipelineReturn {
  const pipelineRef = useRef<VideoFilterPipeline | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const [isFilterActive, setIsFilterActive] = useState(false);

  const start = useCallback((rawStream: MediaStream): MediaStream => {
    if (pipelineRef.current) {
      pipelineRef.current.dispose();
    }

    rawStreamRef.current = rawStream;
    const pipeline = new VideoFilterPipeline();
    pipelineRef.current = pipeline;

    const output = pipeline.start(rawStream);
    setProcessedStream(output);
    return output;
  }, []);

  const setPreset = useCallback((fragmentShader: string | null): boolean => {
    if (!pipelineRef.current) {
      Sentry.logger.warn("setPreset called before pipeline started");
      return false;
    }

    if (!fragmentShader) {
      pipelineRef.current.setFragmentSource(null);
      setIsFilterActive(false);
      return true;
    }

    const ok = pipelineRef.current.setFragmentSource(fragmentShader);
    setIsFilterActive(ok);
    return ok;
  }, []);

  const dispose = useCallback(() => {
    if (pipelineRef.current) {
      pipelineRef.current.dispose();
      pipelineRef.current = null;
    }
    setProcessedStream(null);
    setIsFilterActive(false);
  }, []);

  return { processedStream, isFilterActive, setPreset, start, dispose };
}
