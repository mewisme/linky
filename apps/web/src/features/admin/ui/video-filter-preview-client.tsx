"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@ws/ui/components/ui/alert";
import { useVideoFilterPipeline } from "@/features/call/hooks/webrtc/use-video-filter-pipeline";
import { stopMediaStream } from "@/features/call/lib/webrtc/webrtc";
import { VideoPlayer, useMirrorLocalPreview } from "@/features/chat/ui/video-player";
import { AdminAPI } from "@/features/admin/types/admin.types";
import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ws/ui/components/ui/select";
import { IconCameraOff, IconLoader2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const VIDEO_FILTER_PREVIEW_DRAFT_STORAGE_KEY = "linky.admin.videoFilterPreviewDraft";

export interface VideoFilterPreviewPreset {
  id: string;
  name: string;
  slug: string;
  fragment_shader: string;
}

interface VideoFilterPreviewClientProps {
  initialData: AdminAPI.VideoFilterPresets.Get.Response;
}

type CameraState = "idle" | "requesting" | "ready" | "error";

export function VideoFilterPreviewClient({ initialData }: VideoFilterPreviewClientProps) {
  const t = useTranslations("admin.videoFilterPreview");
  const tc = useTranslations("call.controls");
  const searchParams = useSearchParams();
  const rawStreamRef = useRef<MediaStream | null>(null);
  const { start: startPipeline, setPreset: setPipelinePreset, dispose: disposePipeline } =
    useVideoFilterPipeline();

  const presets: VideoFilterPreviewPreset[] = useMemo(
    () =>
      (initialData.data ?? []).map((preset) => ({
        id: preset.id,
        name: preset.name,
        slug: preset.slug,
        fragment_shader: preset.fragment_shader,
      })),
    [initialData.data],
  );

  const initialPresetId = searchParams.get("preset");
  const useDraftFromUrl = searchParams.get("draft") === "1";

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(initialPresetId);
  const [draftFragmentShader, setDraftFragmentShader] = useState<string | null>(null);
  const [useDraftShader, setUseDraftShader] = useState(false);
  const [shaderCompileFailed, setShaderCompileFailed] = useState(false);
  const [rawStream, setRawStream] = useState<MediaStream | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [cameraAttempt, setCameraAttempt] = useState(0);

  const mirror = useMirrorLocalPreview(rawStream, false);

  useEffect(() => {
    if (!useDraftFromUrl) {
      setDraftFragmentShader(null);
      setUseDraftShader(false);
      setSelectedPresetId(initialPresetId);
      return;
    }

    const stored = sessionStorage.getItem(VIDEO_FILTER_PREVIEW_DRAFT_STORAGE_KEY);
    if (stored?.trim()) {
      setDraftFragmentShader(stored);
      setUseDraftShader(true);
      setSelectedPresetId(null);
      return;
    }

    setDraftFragmentShader(null);
    setUseDraftShader(false);
    setSelectedPresetId(initialPresetId);
  }, [useDraftFromUrl, initialPresetId]);

  const resolveFragmentShader = useCallback(
    (presetId: string | null, draft: boolean): string | null => {
      if (draft) {
        const trimmed = draftFragmentShader?.trim();
        return trimmed ? trimmed : null;
      }
      if (!presetId) {
        return null;
      }
      const preset = presets.find((p) => p.id === presetId);
      const trimmed = preset?.fragment_shader?.trim();
      return trimmed ? trimmed : null;
    },
    [draftFragmentShader, presets],
  );

  const applyFragmentShader = useCallback(
    (fragmentShader: string | null) => {
      if (cameraState !== "ready") {
        return;
      }

      const ok = setPipelinePreset(fragmentShader);
      if (fragmentShader !== null && !ok) {
        setShaderCompileFailed(true);
        setSelectedPresetId(null);
        setUseDraftShader(false);
        setPipelinePreset(null);
        return;
      }

      setShaderCompileFailed(false);
    },
    [cameraState, setPipelinePreset],
  );

  const releaseCamera = useCallback(() => {
    disposePipeline();
    stopMediaStream(rawStreamRef.current);
    rawStreamRef.current = null;
    setRawStream(null);
    setPreviewStream(null);
    setCameraState("idle");
    setCameraError(null);
    setShaderCompileFailed(false);
  }, [disposePipeline]);

  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      setCameraState("requesting");
      setCameraError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        rawStreamRef.current = stream;
        setRawStream(stream);
        const output = startPipeline(stream);
        setPreviewStream(output);
        setCameraState("ready");
      } catch (err) {
        if (cancelled) {
          return;
        }
        const message = err instanceof Error ? err.message : t("cameraErrorGeneric");
        setCameraError(message);
        setCameraState("error");
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      releaseCamera();
    };
  }, [cameraAttempt, startPipeline, releaseCamera, t]);

  useEffect(() => {
    if (cameraState !== "ready") {
      return;
    }
    applyFragmentShader(resolveFragmentShader(selectedPresetId, useDraftShader));
  }, [
    cameraState,
    previewStream,
    selectedPresetId,
    useDraftShader,
    draftFragmentShader,
    resolveFragmentShader,
    applyFragmentShader,
  ]);

  const dropdownValue = useDraftShader ? "draft" : selectedPresetId ? selectedPresetId : "none";

  const handleFilterChange = (value: string) => {
    if (value === "none") {
      setSelectedPresetId(null);
      setUseDraftShader(false);
      applyFragmentShader(null);
      return;
    }

    if (value === "draft") {
      if (!draftFragmentShader?.trim()) {
        return;
      }
      setUseDraftShader(true);
      setSelectedPresetId(null);
      applyFragmentShader(draftFragmentShader.trim());
      return;
    }

    setSelectedPresetId(value);
    setUseDraftShader(false);
    applyFragmentShader(resolveFragmentShader(value, false));
  };

  return (
    <AppLayout
      label={t("title")}
      description={t("description")}
      backHref="/admin/video-filter-presets"
      backLabel={t("backToPresets")}
    >
      <div className="mb-4 flex justify-end">
        <Select
          value={dropdownValue}
          disabled={cameraState !== "ready"}
          onValueChange={handleFilterChange}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder={t("presetsLabel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{tc("noFilter")}</SelectItem>
            {draftFragmentShader?.trim() ? (
              <SelectItem value="draft">{t("draftShader")}</SelectItem>
            ) : null}
            {presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {cameraState === "error" ? (
        <Alert variant="destructive" className="mb-4">
          <div className="flex items-start gap-3">
            <IconCameraOff className="mt-0.5 size-4" />
            <div className="min-w-0 flex-1">
              <AlertTitle>{t("cameraRequired")}</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">
                {cameraError ?? t("cameraErrorGeneric")}
              </AlertDescription>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCameraAttempt((n) => n + 1)}
                >
                  {t("retryCamera")}
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      ) : null}

      {shaderCompileFailed && cameraState === "ready" ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{tc("filterShaderError")}</AlertTitle>
          <AlertDescription>{t("shaderCompileFailedHint")}</AlertDescription>
        </Alert>
      ) : null}

      <div className="relative h-[calc(80dvh-16rem)]">
        {cameraState === "requesting" && (
          <div className=" inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <IconLoader2 className="size-8 animate-spin" />
            <p className="text-sm">{t("requestingCamera")}</p>
          </div>
        )}

        {cameraState === "ready" && (
          <VideoPlayer
            stream={previewStream}
            muted
            playsInline
            objectFit="cover"
            mirrored={mirror}
            className="size-full"
          />
        )}
      </div>
    </AppLayout>
  );
}
