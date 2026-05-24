"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ws/ui/components/ui/dialog";
import { ScrollArea } from "@ws/ui/components/ui/scroll-area";
import { Skeleton } from "@ws/ui/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

interface PresetOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  fragment_shader: string;
}

interface VideoFilterPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId: string | null;
  onSelect: (presetId: string | null, fragmentShader: string | null) => void;
  fetchPresets: () => Promise<PresetOption[]>;
}

export function VideoFilterPickerDialog({
  open,
  onOpenChange,
  selectedId,
  onSelect,
  fetchPresets,
}: VideoFilterPickerDialogProps) {
  const t = useTranslations("call");
  const [presets, setPresets] = useState<PresetOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchPresets()
      .then(setPresets)
      .finally(() => setLoading(false));
  }, [open, fetchPresets]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("controls.videoFilter")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 pr-2">
            <button
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                !selectedId ? "border-primary bg-primary/10" : "hover:bg-muted"
              }`}
              onClick={() => {
                onSelect(null, null);
                onOpenChange(false);
              }}
            >
              <div className="w-12 h-9 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                OFF
              </div>
              <span className="text-sm font-medium">{t("controls.noFilter")}</span>
            </button>

            {loading && (
              <>
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </>
            )}

            {!loading &&
              presets.map((preset) => (
                <button
                  key={preset.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedId === preset.id ? "border-primary bg-primary/10" : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    onSelect(preset.id, preset.fragment_shader);
                    onOpenChange(false);
                  }}
                >
                  <div className="w-12 h-9 bg-muted rounded overflow-hidden flex-shrink-0">
                    {preset.thumbnail_url ? (
                      <img
                        src={preset.thumbnail_url}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                        {preset.slug.slice(0, 3).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{preset.name}</div>
                    {preset.description && (
                      <div className="text-xs text-muted-foreground truncate">{preset.description}</div>
                    )}
                  </div>
                </button>
              ))}

            {!loading && presets.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                {t("controls.noFilter")}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
