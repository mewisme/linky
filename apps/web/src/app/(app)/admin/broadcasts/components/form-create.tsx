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
import { IconSend, IconLoader2 } from "@tabler/icons-react";
import { cn } from "@ws/ui/lib/utils";
import { postData } from "@/lib/api/fetch/client-api";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { useUserTokenContext } from "@/components/providers/user/user-token-provider";
import { useSoundWithSettings } from "@/hooks/audio/use-sound-with-settings";
import type { AdminAPI } from "@/types/admin.types";

const formSchema = z.object({
  title: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  pushUrl: z
    .string()
    .optional()
    .refine((v) => !v || v.startsWith("/"), "URL must start with /"),
  deliveryMode: z.enum(["push_only", "push_and_save"]),
});

type FormValues = z.infer<typeof formSchema>;

interface FormCreateBroadcastProps {
  onSuccess?: () => void;
}

export function FormCreateBroadcast({ onSuccess }: FormCreateBroadcastProps) {
  const { token } = useUserTokenContext();
  const { play: playSound } = useSoundWithSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      message: "",
      pushUrl: "",
      deliveryMode: "push_only",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: FormValues) {
    if (!token) {
      toast.error("Please sign in again");
      return;
    }

    try {
      const res = await postData<AdminAPI.Broadcasts.Post.Response>(
        apiUrl.admin.broadcasts(),
        {
          token,
          body: {
            message: values.message.trim(),
            title: values.title?.trim() || undefined,
            deliveryMode: values.deliveryMode,
            url: values.pushUrl?.trim() || undefined,
          },
        }
      );

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
