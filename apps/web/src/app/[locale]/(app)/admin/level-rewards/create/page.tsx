"use client";

import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@ws/ui/components/kibo-ui/dropzone";
import React, { useState } from "react";

import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { Input } from "@ws/ui/components/ui/input";
import { Label } from "@ws/ui/components/ui/label";
import { Link } from "@/i18n/navigation";
import { Loader2 } from "@ws/ui/internal-lib/icons";
import { PayloadHintGuide } from "@/features/admin/ui/payload-hint-guide";
import { Textarea } from "@ws/ui/components/ui/textarea";
import { createLevelReward } from "@/features/admin/api/level-rewards";
import { getAdminPresignedUpload } from "@/lib/http/adapters/admin-media";
import { toast } from "@ws/ui/components/ui/sonner";
import { uploadToS3 } from "@/lib/http/adapters/s3";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useSoundWithSettings } from "@/shared/hooks/audio/use-sound-with-settings";
import { useUserTokenContext } from "@/providers/user/user-token-provider";

const IMAGE_ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function CreateLevelRewardPage() {
  const t = useTranslations("admin");
  const tp = useTranslations("admin.levelRewardCreatePage");
  const tf = useTranslations("admin.levelForm");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const { getToken } = useUserTokenContext();
  const { play: playSound } = useSoundWithSettings();
  const router = useRouter();
  const [levelRequired, setLevelRequired] = useState<number>(1);
  const [rewardType, setRewardType] = useState("");
  const [payloadText, setPayloadText] = useState("{}");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let rewardPayload: Record<string, unknown>;
    try {
      rewardPayload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      toast.error(t("invalidRewardJson"));
      return;
    }

    if (typeof rewardPayload !== "object" || rewardPayload === null || Array.isArray(rewardPayload)) {
      toast.error(t("rewardPayloadObject"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedFile) {
        const token = await getToken();
        if (!token) throw new Error(te("authRequired"));
        const { upload_url, resource_key } = await getAdminPresignedUpload(
          { intent: "reward", content_type: selectedFile.type },
          token
        );
        await uploadToS3(upload_url, selectedFile);
        rewardPayload = {
          ...rewardPayload,
          media: {
            resource_type: "s3",
            resource_key,
            content_type: selectedFile.type,
          },
        };
      }

      await createLevelReward({
        level_required: levelRequired,
        reward_type: rewardType,
        reward_payload: rewardPayload,
      });

      playSound("success");
      toast.success(t("levelRewardCreated"));
      router.push("/admin/level-rewards");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout
      label={t("createLevelRewardTitle")}
      description={t("createLevelRewardDescription")}
      backButton
      className="space-y-4"
    >
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
        <nav className="text-sm text-muted-foreground">
          <Link href="/admin/level-rewards" className="hover:text-foreground">
            {tp("breadcrumbParent")}
          </Link>
          <span className="mx-2">/</span>
          <span>{tp("breadcrumbCreate")}</span>
        </nav>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level_required">
                {tf("levelRequired")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="level_required"
                type="number"
                min={1}
                placeholder={tf("levelPlaceholder")}
                value={levelRequired}
                required
                onChange={(e) => setLevelRequired(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward_type">
                {tf("rewardType")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reward_type"
                placeholder={tf("rewardTypePlaceholder")}
                value={rewardType}
                required
                onChange={(e) => setRewardType(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reward_payload">
              {tf("rewardPayload")} <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              {tp("payloadIntro")}
            </p>
            <PayloadHintGuide variant="reward" typeOrKey={rewardType} />
            <Textarea
              id="reward_payload"
              rows={6}
              placeholder='{"name": "Gold Frame", "value": 100}'
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>{tp("mediaOptional")}</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {tp("mediaHint")}
            </p>
            <Dropzone
              accept={IMAGE_ACCEPT}
              maxFiles={1}
              maxSize={MAX_FILE_SIZE}
              src={selectedFile ? [selectedFile] : undefined}
              onDrop={(accepted) => setSelectedFile(accepted[0] ?? null)}
              onError={(err) => toast.error(err.message)}
            >
              {selectedFile ? <DropzoneContent /> : <DropzoneEmptyState />}
            </Dropzone>
            {selectedFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                {tp("clearFile")}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/level-rewards">{tc("cancel")}</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : tp("submit")}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
