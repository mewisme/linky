"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ws/ui/components/ui/dialog";
import { Dropzone, DropzoneEmptyState } from "@ws/ui/components/kibo-ui/dropzone";
import { useCallback, useState } from "react";

import type { AdminAPI } from "@/features/admin/types/admin.types";
import { Button } from "@ws/ui/components/ui/button";
import { Label } from "@ws/ui/components/ui/label";
import { Loader2 } from "@ws/ui/internal-lib/icons";
import { toast } from "@ws/ui/components/ui/sonner";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import { importInterestTags } from "@/features/admin/api/interest-tags";
import { useTranslations } from "next-intl";

export interface ImportInterestTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportInterestTagsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportInterestTagsDialogProps) {
  const t = useTranslations("dataTable");
  const tc = useTranslations("common");
  const exampleJson = t("importInterestTags.exampleJsonBlock");
  const { play: playSound } = useSoundWithSettings();
  const [file, setFile] = useState<File | null>(null);
  const [paste, setPaste] = useState("");
  const [importing, setImporting] = useState(false);

  const reset = useCallback(() => {
    setFile(null);
    setPaste("");
  }, []);

  const getItemsFromInput = useCallback(async (): Promise<AdminAPI.InterestTags.Import.Body["items"] | null> => {
    let raw: string;
    if (file) {
      raw = await file.text();
    } else {
      raw = paste.trim();
    }
    if (!raw) {
      toast.error(t("importInterestTags.provideJson"));
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.error(t("importInterestTags.invalidJson"));
      return null;
    }
    let items: unknown[];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)) {
      items = (parsed as { items: unknown[] }).items;
    } else {
      toast.error(t("importInterestTags.invalidShape"));
      return null;
    }
    return items as AdminAPI.InterestTags.Import.Body["items"];
  }, [file, paste, t]);

  const handleSubmit = useCallback(async () => {
    const items = await getItemsFromInput();
    if (!items) return;

    setImporting(true);
    try {
      const data = await importInterestTags({ items });

      playSound("success");
      toast.success(
        t("importInterestTags.importComplete", {
          created: data.created,
          updated: data.updated,
          skipped: data.skipped_invalid,
        })
      );
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("importInterestTags.importFailed"));
    } finally {
      setImporting(false);
    }
  }, [getItemsFromInput, onSuccess, onOpenChange, reset, playSound, t]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-[540px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("importInterestTags.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("importInterestTags.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>{t("importInterestTags.jsonFile")}</Label>
              <Dropzone
                accept={{ "application/json": [".json"], "text/plain": [".json"] }}
                maxFiles={1}
                src={file ? [file] : undefined}
                onDrop={(accepted) => setFile(accepted[0] ?? null)}
              >
                {file ? (
                  <p className="text-sm text-muted-foreground truncate">{file.name}</p>
                ) : (
                  <DropzoneEmptyState />
                )}
              </Dropzone>
            </div>
            <div className="space-y-2">
              <Label htmlFor="import-paste">{t("importInterestTags.orPasteJson")}</Label>
              <textarea
                id="import-paste"
                rows={6}
                placeholder={t("importInterestTags.placeholderJson")}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                data-testid="admin-interest-tags-json-input"
              />
            </div>
            <details className="text-sm overflow-x-auto">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{t("importInterestTags.exampleFormat")}</summary>
              <pre className="mt-2 max-h-[200px] overflow-auto rounded border bg-muted p-3 text-xs whitespace-pre-wrap">{exampleJson}</pre>
            </details>
          </div>
        </div>
        <DialogFooter className="shrink-0">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={importing} data-testid="admin-interest-tags-import-submit">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : t("importInterestTags.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
