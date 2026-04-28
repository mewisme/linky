"use client";

import { Button } from "@ws/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ws/ui/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@ws/ui/components/ui/field";
import { Input } from "@ws/ui/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@ws/ui/components/ui/radio-group";
import { Separator } from "@ws/ui/components/ui/separator";
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
  setSelectedTone: (tone: "primary" | AdminAPI.Broadcasts.AiBroadcastTone) => void;
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
          <div className="text-xs text-muted-foreground">{tbf("aiWriterDescription")}</div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAiDialogOpen(true)}
        >
          <IconSparkles className="mr-2 size-4" />
          {tbf("aiWriterTitle")}
        </Button>
      </div>

      <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tbf("aiWriterTitle")}</DialogTitle>
            <DialogDescription>{tbf("aiWriterDescription")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <FieldGroup>
              <div className="w-full space-y-4">
                <Field data-invalid={Boolean(audienceError)}>
                  <FieldLabel htmlFor="broadcast-audience">{tbf("targetAudience")}</FieldLabel>
                  <Input
                    id="broadcast-audience"
                    placeholder={tbf("audiencePlaceholder")}
                    className="bg-background w-full"
                    aria-invalid={Boolean(audienceError)}
                    {...form.register("audience")}
                  />
                  <FieldError errors={[{ message: audienceError }]} />
                </Field>

                <div className="sm:hidden" />

                <Field className="sm:col-span-2" data-invalid={Boolean(keyPointsError)}>
                  <FieldLabel htmlFor="broadcast-key-points">{tbf("keyPoints")}</FieldLabel>
                  <Textarea
                    id="broadcast-key-points"
                    placeholder={tbf("keyPointsPlaceholder")}
                    rows={4}
                    className="bg-background min-h-[120px] resize-y sm:min-h-[140px]"
                    aria-invalid={Boolean(keyPointsError)}
                    {...form.register("key_points")}
                  />
                  <FieldError errors={[{ message: keyPointsError }]} />
                </Field>
              </div>
            </FieldGroup>

            <div className="flex justify-end">
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
            </div>

            {aiDraft && selectedDraft && (
              <div className="flex flex-col gap-3">
                <Separator />

                <FieldSet className="gap-2">
                  <div className="text-sm font-medium">{tbf("preview")}</div>
                  <RadioGroup
                    value={selectedTone}
                    onValueChange={(v) => setSelectedTone(v as typeof selectedTone)}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <Field orientation="horizontal">
                      <RadioGroupItem value="primary" id="tone-primary" />
                      <FieldLabel htmlFor="tone-primary" className="font-normal">{tbf("recommended")}</FieldLabel>
                    </Field>
                    {(["friendly", "professional", "direct"] as AdminAPI.Broadcasts.AiBroadcastTone[]).map((tone) => (
                      <Field key={tone} orientation="horizontal">
                        <RadioGroupItem value={tone} id={`tone-${tone}`} />
                        <FieldLabel htmlFor={`tone-${tone}`} className="font-normal">{tone}</FieldLabel>
                      </Field>
                    ))}
                  </RadioGroup>
                </FieldSet>

                <div className="flex flex-col gap-2">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{tbf("titleLabel")}</div>
                    <div className="mt-1 rounded-md bg-muted p-3 text-sm">{selectedDraft.title}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">{tbf("messageLabel")}</div>
                    <div className="mt-1 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{`${selectedDraft.body}\n\n${selectedDraft.cta}`}</div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="outline" onClick={onUseAiDraft}>
                    {tbf("useDraft")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
