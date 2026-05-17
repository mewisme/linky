"use client";

import * as Sentry from "@sentry/nextjs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ws/ui/components/ui/dialog";
import { Button } from "@ws/ui/components/ui/button";
import { Label } from "@ws/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@ws/ui/components/ui/radio-group";
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  STREAM_VIDEO_QUALITY_VALUES,
  normalizeUserCallPreferences,
  type StreamVideoQuality,
} from "@/entities/user/lib/user-settings-preferences";
import { useUserContext } from "@/providers/user/user-provider";

interface StreamVideoQualityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (quality: StreamVideoQuality) => Promise<void> | void;
}

export function StreamVideoQualityDialog({ open, onOpenChange, onApply }: StreamVideoQualityDialogProps) {
  const t = useTranslations("call.dialogs.streamQuality");
  const tCommon = useTranslations("common");
  const {
    store: { userSettings },
    state: { updateUserSettings },
  } = useUserContext();

  const currentQuality = useMemo(
    () => normalizeUserCallPreferences(userSettings?.call).quality,
    [userSettings?.call],
  );

  const [draft, setDraft] = useState<StreamVideoQuality>(currentQuality);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(currentQuality);
    }
  }, [currentQuality, open]);

  const handleSave = async () => {
    if (draft === currentQuality) {
      onOpenChange(false);
      return;
    }
    setIsSaving(true);
    try {
      const currentCall = normalizeUserCallPreferences(userSettings?.call);
      await updateUserSettings({
        call: { ...currentCall, quality: draft },
      });
      await Promise.resolve(onApply(draft));
      toast.success(t("updated"));
      onOpenChange(false);
    } catch (err) {
      Sentry.logger.error("Failed to update stream quality", { error: err });
      toast.error(err instanceof Error ? err.message : t("updateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={draft}
          onValueChange={(value) => setDraft(value as StreamVideoQuality)}
          className="gap-3 py-2"
        >
          {STREAM_VIDEO_QUALITY_VALUES.map((quality) => {
            const id = `stream-quality-${quality}`;
            return (
              <Label
                key={quality}
                htmlFor={id}
                className="flex cursor-pointer items-start gap-3 rounded-md border bg-card p-3 text-card-foreground transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary"
              >
                <RadioGroupItem id={id} value={quality} className="mt-1" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{t(`options.${quality}.label`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {t(`options.${quality}.description`)}
                  </span>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("saving") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
