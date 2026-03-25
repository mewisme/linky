"use client";

import * as z from "@ws/ui/internal-lib/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@ws/ui/components/ui/form";
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
import { Button } from "@ws/ui/components/ui/button";
import { Input } from "@ws/ui/components/ui/input";
import { Label } from "@ws/ui/components/ui/label";
import { Textarea } from "@ws/ui/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@ws/ui/components/ui/radio-group";
import { Separator } from "@ws/ui/components/ui/separator";
import { IconSend, IconLoader2, IconSparkles } from "@tabler/icons-react";
import { cn } from "@ws/ui/lib/utils";
import { createBroadcast, generateBroadcastAiDraft } from "@/features/admin/api/broadcasts";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import type { AdminAPI } from "@/features/admin/types/admin.types";

const formSchema = z.object({
  title: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  pushUrl: z
    .string()
    .optional()
    .refine((v) => !v || v.startsWith("/"), "URL must start with /"),
  deliveryMode: z.enum(["push_only", "push_and_save"]),
  audience: z.string().optional(),
  key_points: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FormCreateBroadcastProps {
  onSuccess?: () => void;
}

export function FormCreateBroadcast({ onSuccess }: FormCreateBroadcastProps) {
  const { play: playSound } = useSoundWithSettings();
  const [aiDraft, setAiDraft] = useState<AdminAPI.Broadcasts.AiBroadcastDraft | null>(null);
  const [selectedTone, setSelectedTone] = useState<"primary" | AdminAPI.Broadcasts.AiBroadcastTone>("primary");
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<FormValues>({
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

  async function onSubmit(values: FormValues) {
    try {
      const res = await createBroadcast({
        message: values.message.trim(),
        title: values.title?.trim() || undefined,
        deliveryMode: values.deliveryMode,
        url: values.pushUrl?.trim() || undefined,
      } satisfies AdminAPI.Broadcasts.Post.Body);

      playSound("success");
      toast.success(res.message ?? `Broadcast sent to ${res.sent} user(s).`);
      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send broadcast"
      );
    }
  }

  const selectedDraft = useMemo((): AdminAPI.Broadcasts.AiBroadcastDraftPrimary & { tone?: AdminAPI.Broadcasts.AiBroadcastTone } | null => {
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
      toast.error("Audience is required for AI generation");
      return;
    }
    if (!keyPoints) {
      toast.error("Key points are required for AI generation");
      return;
    }

    try {
      setIsGenerating(true);
      const res = await generateBroadcastAiDraft({
        audience,
        key_points: keyPoints,
      });
      setAiDraft(res.draft);
      setSelectedTone("primary");
      toast.success("AI draft generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate AI draft");
    } finally {
      setIsGenerating(false);
    }
  }

  function onUseAiDraft() {
    if (!selectedDraft) return;
    form.setValue("title", selectedDraft.title);
    form.setValue("message", `${selectedDraft.body}\n\n${selectedDraft.cta}`);
    toast.success("Draft applied to the form");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 pb-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg">New broadcast</CardTitle>
        <CardDescription className="text-sm">
          Save to in-app notifications or send a push-only announcement.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pt-0 sm:px-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 sm:gap-6"
          >
            <div className="space-y-3 rounded-lg border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">AI broadcast writer</div>
                  <div className="text-xs text-muted-foreground">Generate a draft for the notification message.</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isGenerating}
                  onClick={onGenerateAiDraft}
                >
                  {isGenerating ? (
                    <>
                      <IconLoader2 className="mr-2 size-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <IconSparkles className="mr-2 size-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="broadcast-audience">Target audience</FormLabel>
                      <FormControl>
                        <Input id="broadcast-audience" placeholder="e.g. all new users" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="sm:hidden" />

                <FormField
                  control={form.control}
                  name="key_points"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel htmlFor="broadcast-key-points">Key points</FormLabel>
                      <FormControl>
                        <Textarea
                          id="broadcast-key-points"
                          placeholder="e.g. what happened, why it matters, what to do next"
                          rows={4}
                          className="bg-background min-h-[120px] resize-y sm:min-h-[140px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {aiDraft && selectedDraft && (
                <div className="space-y-3">
                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Preview</div>
                    <RadioGroup
                      value={selectedTone}
                      onValueChange={(v) => setSelectedTone(v as typeof selectedTone)}
                      className="flex flex-col gap-2 sm:flex-row"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <RadioGroupItem value="primary" id="tone-primary" />
                        <FormLabel htmlFor="tone-primary" className="font-normal">Recommended</FormLabel>
                      </FormItem>
                      {(["friendly", "professional", "direct"] as AdminAPI.Broadcasts.AiBroadcastTone[]).map((tone) => (
                        <FormItem key={tone} className="flex items-center space-x-2">
                          <RadioGroupItem value={tone} id={`tone-${tone}`} />
                          <FormLabel htmlFor={`tone-${tone}`} className="font-normal">{tone}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Title</div>
                      <div className="mt-1 rounded-md bg-muted p-3 text-sm">{selectedDraft.title}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Message</div>
                      <div className="mt-1 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{selectedDraft.body}\n\n{selectedDraft.cta}</div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" variant="outline" onClick={onUseAiDraft}>
                      Use draft
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="broadcast-title">Title (optional)</FormLabel>
                    <FormControl>
                      <Input
                        id="broadcast-title"
                        placeholder="e.g. Announcement"
                        className="bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pushUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="broadcast-url">Push URL (optional)</FormLabel>
                    <FormControl>
                      <Input
                        id="broadcast-url"
                        placeholder="/notifications"
                        className="bg-background font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="broadcast-message">Message</FormLabel>
                  <FormControl>
                    <Textarea
                      id="broadcast-message"
                      placeholder="Write your announcement..."
                      rows={5}
                      className="bg-background min-h-[120px] resize-y sm:min-h-[140px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="deliveryMode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Delivery</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      <Label
                        htmlFor="delivery-push-and-save"
                        className={cn(
                          "flex cursor-pointer flex-col gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-colors hover:bg-muted/50 sm:px-4 sm:py-3",
                          field.value === "push_and_save"
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium sm:text-base">
                          <RadioGroupItem
                            value="push_and_save"
                            id="delivery-push-and-save"
                            className="size-4 shrink-0"
                          />
                          Push + in-app (save)
                        </span>
                        <span className="text-muted-foreground pl-6 text-xs sm:text-sm">
                          Notification stored for later viewing.
                        </span>
                      </Label>
                      <Label
                        htmlFor="delivery-push-only"
                        className={cn(
                          "flex cursor-pointer flex-col gap-1.5 rounded-lg border-2 px-3 py-2.5 transition-colors hover:bg-muted/50 sm:px-4 sm:py-3",
                          field.value === "push_only"
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        )}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium sm:text-base">
                          <RadioGroupItem
                            value="push_only"
                            id="delivery-push-only"
                            className="size-4 shrink-0"
                          />
                          Push only (no in-app)
                        </span>
                        <span className="text-muted-foreground pl-6 text-xs sm:text-sm">
                          One-time push, not saved in app.
                        </span>
                      </Label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <IconLoader2 className="mr-2 size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <IconSend className="mr-2 size-4" />
                    Send broadcast
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
