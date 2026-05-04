import type { AdminAPI } from "@/features/admin/types/admin.types";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "@ws/ui/internal-lib/react-hook-form";

export type BroadcastFormValues = {
  title?: string;
  message: string;
  pushUrl?: string;
  deliveryMode: "push_only" | "push_and_save";
  audience?: string;
  key_points?: string;
};

export type BroadcastFormTranslationFn = ReturnType<typeof useTranslations>;

export type BroadcastFormInstance = UseFormReturn<BroadcastFormValues>;

export type SelectedAiDraft =
  | (AdminAPI.Broadcasts.AiBroadcastDraftPrimary & {
    tone?: AdminAPI.Broadcasts.AiBroadcastTone;
  })
  | null;
