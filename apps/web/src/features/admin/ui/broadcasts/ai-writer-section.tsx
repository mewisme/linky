"use client";

import { Button } from "@ws/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ws/ui/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@ws/ui/components/ui/field";
import { Input } from "@ws/ui/components/ui/input";
import { Label } from "@ws/ui/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@ws/ui/components/ui/radio-group";
import { Textarea } from "@ws/ui/components/ui/textarea";
import { IconLoader2, IconSparkles } from "@tabler/icons-react";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import type {
  BroadcastFormInstance,
  BroadcastFormTranslationFn,
  SelectedAiDraft,
} from "./form-create.types";

interface AiWriterSectionProps {
  tbf: BroadcastFormTranslationFn;
  form: BroadcastFormInstance;
  aiDraft: AdminAPI.Broadcasts.AiBroadcastDraft | null;
  selectedDraft: SelectedAiDraft;
  selectedTone: "primary" | AdminAPI.Broadcasts.AiBroadcastTone;
  isGenerating: boolean;
  isAiDialogOpen: boolean;
  setSelectedTone: (
    tone: "primary" | AdminAPI.Broadcasts.AiBroadcastTone,
  ) => void;
  setIsAiDialogOpen: (open: boolean) => void;
  onGenerateAiDraft: () => Promise<void>;
  onUseAiDraft: () => void;
}

export function AiWriterSection({
  tbf,
  form,
  aiDraft,
  selectedDraft,
  selectedTone,
  isGenerating,
  isAiDialogOpen,
  setSelectedTone,
  setIsAiDialogOpen,
  onGenerateAiDraft,
  onUseAiDraft,
}: AiWriterSectionProps) {
  const audienceError = form.formState.errors.audience?.message;
  const keyPointsError = form.formState.errors.key_points?.message;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{tbf("aiWriterTitle")}</div>
          <div className="text-xs text-muted-foreground">
            {tbf("aiWriterDescription")}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAiDialogOpen(true)}
        >
          <IconSparkles className="mr-2 size-4" />
          {tbf("generate")}
        </Button>
      </div>

      {aiDraft && selectedDraft && (
        <AiDraftPreview
          tbf={tbf}
          selectedDraft={selectedDraft}
          selectedTone={selectedTone}
          setSelectedTone={setSelectedTone}
          onUseAiDraft={onUseAiDraft}
        />
      )}

      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>{tbf("aiWriterTitle")}</DialogTitle>
            <DialogDescription>{tbf("aiWriterDescription")}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <div className="w-full space-y-4">
              <Field data-invalid={Boolean(audienceError)}>
                <FieldLabel htmlFor="broadcast-audience">
                  {tbf("targetAudience")}
                </FieldLabel>
                <Input
                  id="broadcast-audience"
                  placeholder={tbf("audiencePlaceholder")}
                  className="w-full bg-background"
                  aria-invalid={Boolean(audienceError)}
                  {...form.register("audience")}
                />
                <FieldError errors={[{ message: audienceError }]} />
              </Field>

              <Field data-invalid={Boolean(keyPointsError)}>
                <FieldLabel htmlFor="broadcast-key-points">
                  {tbf("keyPoints")}
                </FieldLabel>
                <Textarea
                  id="broadcast-key-points"
                  placeholder={tbf("keyPointsPlaceholder")}
                  rows={4}
                  className="min-h-[120px] w-full resize-y bg-background sm:min-h-[140px]"
                  aria-invalid={Boolean(keyPointsError)}
                  {...form.register("key_points")}
                />
                <FieldError errors={[{ message: keyPointsError }]} />
              </Field>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isGenerating}
              onClick={onGenerateAiDraft}
            >
              {isGenerating ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  {tbf("generating")}
                </>
              ) : (
                <>
                  <IconSparkles className="mr-2 size-4" />
                  {tbf("generate")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface AiDraftPreviewProps {
  tbf: BroadcastFormTranslationFn;
  selectedDraft: NonNullable<SelectedAiDraft>;
  selectedTone: "primary" | AdminAPI.Broadcasts.AiBroadcastTone;
  setSelectedTone: (
    tone: "primary" | AdminAPI.Broadcasts.AiBroadcastTone,
  ) => void;
  onUseAiDraft: () => void;
}

function AiDraftPreview({
  tbf,
  selectedDraft,
  selectedTone,
  setSelectedTone,
  onUseAiDraft,
}: AiDraftPreviewProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-t pt-3">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="text-sm font-medium">{tbf("preview")}</div>
        <RadioGroup
          value={selectedTone}
          onValueChange={(v) => setSelectedTone(v as typeof selectedTone)}
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="primary" id="tone-primary" />
            <Label
              htmlFor="tone-primary"
              className="cursor-pointer font-normal"
            >
              {tbf("recommended")}
            </Label>
          </div>
          {(
            [
              "friendly",
              "professional",
              "direct",
            ] as AdminAPI.Broadcasts.AiBroadcastTone[]
          ).map((tone) => (
            <div key={tone} className="flex items-center gap-2">
              <RadioGroupItem value={tone} id={`tone-${tone}`} />
              <Label
                htmlFor={`tone-${tone}`}
                className="cursor-pointer font-normal capitalize"
              >
                {tone}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">
            {tbf("titleLabel")}
          </div>
          <div className="mt-1 break-words rounded-md bg-muted p-3 text-sm">
            {selectedDraft.title}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">
            {tbf("messageLabel")}
          </div>
          <div className="mt-1 break-words rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
            {`${selectedDraft.body}\n\n${selectedDraft.cta}`}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onUseAiDraft}>
          {tbf("useDraft")}
        </Button>
      </div>
    </div>
  );
}
