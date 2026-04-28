"use client";

import * as z from "@ws/ui/internal-lib/zod";
import { Form } from "@ws/ui/components/ui/form";
import { toast } from "@ws/ui/internal-lib/toast";
import { useForm } from "@ws/ui/internal-lib/react-hook-form";
import { zodResolver } from "@ws/ui/internal-lib/hookform";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ws/ui/components/ui/card";
import { Separator } from "@ws/ui/components/ui/separator";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { useTranslations } from "next-intl";
import { AiWriterSection } from "./ai-writer-section";
import { BroadcastContentFields } from "./broadcast-content-fields";
import { DeliveryModeField } from "./delivery-mode-field";
import type { BroadcastFormValues, SelectedAiDraft } from "./form-create.types";
import { SubmitBroadcastButton } from "./submit-broadcast-button";

interface FormCreateBroadcastProps {
  onSuccess?: () => void;
}

export function FormCreateBroadcast({ onSuccess }: FormCreateBroadcastProps) {
  const t = useTranslations("admin");
  const tbf = useTranslations("admin.broadcastForm");
  const { play: playSound } = useSoundWithSettings();
  const [aiDraft, setAiDraft] = useState<AdminAPI.Broadcasts.AiBroadcastDraft | null>(null);
  const [selectedTone, setSelectedTone] = useState<"primary" | AdminAPI.Broadcasts.AiBroadcastTone>("primary");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  const formSchema = useMemo(
    () =>
      z.object({
        title: z.string().optional(),
        message: z.string().min(1, tbf("messageRequired")),
        pushUrl: z
          .string()
          .optional()
          .refine((v) => !v || v.startsWith("/"), tbf("urlMustStartWithSlash")),
        deliveryMode: z.enum(["push_only", "push_and_save"]),
        audience: z.string().optional(),
        key_points: z.string().optional(),
      }),
    [tbf],
  );

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      message: "",
      pushUrl: "",
      deliveryMode: "push_only",
      audience: "",
      key_points: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: BroadcastFormValues) {
    try {
      const res = await fetchFromActionRoute<AdminAPI.Broadcasts.Post.Response>("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: values.message.trim(),
          title: values.title?.trim() || undefined,
          deliveryMode: values.deliveryMode,
          url: values.pushUrl?.trim() || undefined,
        } satisfies AdminAPI.Broadcasts.Post.Body),
      });

      playSound("success");
      toast.success(res.message ?? t("broadcastSent", { count: res.sent }));
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("broadcastSendFailed")
      );
    }
  }

  const selectedDraft = useMemo((): SelectedAiDraft => {
    if (!aiDraft) return null
    if (selectedTone === "primary") return aiDraft.primary
    const toneVariant = aiDraft.tone_variants.find((v) => v.tone === selectedTone)
    if (!toneVariant) return null
    return toneVariant
  }, [aiDraft, selectedTone]);

  async function onGenerateAiDraft() {
    const audience = form.getValues("audience")?.trim() ?? "";
    const keyPoints = form.getValues("key_points")?.trim() ?? "";

    if (!audience) {
      toast.error(t("audienceRequired"));
      return;
    }
    if (!keyPoints) {
      toast.error(t("keyPointsRequired"));
      return;
    }

    try {
      setIsGenerating(true);
      const res = await fetchFromActionRoute<AdminAPI.Broadcasts.AiGenerate.Response>(
        "/api/admin/broadcasts/ai-draft",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audience,
            key_points: keyPoints,
          }),
        },
      );
      setAiDraft(res.draft);
      setSelectedTone("primary");
      toast.success(t("aiDraftGenerated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("aiDraftFailed"));
    } finally {
      setIsGenerating(false);
    }
  }

  function onUseAiDraft() {
    if (!selectedDraft) return;
    form.setValue("title", selectedDraft.title);
    form.setValue("message", `${selectedDraft.body}\n\n${selectedDraft.cta}`);
    setIsAiDialogOpen(false);
    toast.success(t("draftApplied"));
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 pb-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg">{tbf("newBroadcast")}</CardTitle>
        <CardDescription className="text-sm">
          {tbf("cardDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pt-0 sm:px-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 sm:gap-6"
          >
            <AiWriterSection
              tbf={tbf}
              form={form}
              aiDraft={aiDraft}
              selectedDraft={selectedDraft}
              selectedTone={selectedTone}
              isGenerating={isGenerating}
              isAiDialogOpen={isAiDialogOpen}
              setSelectedTone={setSelectedTone}
              setIsAiDialogOpen={setIsAiDialogOpen}
              onGenerateAiDraft={onGenerateAiDraft}
              onUseAiDraft={onUseAiDraft}
            />

            <BroadcastContentFields tbf={tbf} form={form} />

            <Separator />

            <DeliveryModeField tbf={tbf} form={form} />

            <SubmitBroadcastButton tbf={tbf} isSubmitting={isSubmitting} />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
