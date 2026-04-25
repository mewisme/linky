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
import { createLevelFeatureUnlock } from "@/features/admin/api/level-feature-unlocks";
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

export default function CreateLevelFeatureUnlockPage() {
  const t = useTranslations("admin");
  const tp = useTranslations("admin.featureUnlockCreatePage");
  const tf = useTranslations("admin.levelForm");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const { getToken } = useUserTokenContext();
  const { play: playSound } = useSoundWithSettings();
  const router = useRouter();
  const [levelRequired, setLevelRequired] = useState<number>(1);
  const [featureKey, setFeatureKey] = useState("");
  const [payloadText, setPayloadText] = useState("{}");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let featurePayload: Record<string, unknown>;
    try {
      featurePayload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      toast.error(t("invalidJsonPayload"));
      return;
    }

    if (typeof featurePayload !== "object" || featurePayload === null || Array.isArray(featurePayload)) {
      toast.error(t("payloadMustBeObject"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedFile) {
        const token = await getToken();
        if (!token) throw new Error(te("authRequired"));
        const { upload_url, resource_key } = await getAdminPresignedUpload(
          { intent: "feature", content_type: selectedFile.type },
          token
        );
        await uploadToS3(upload_url, selectedFile);
        featurePayload = {
          ...featurePayload,
          media: {
            resource_type: "s3",
            resource_key,
            content_type: selectedFile.type,
          },
        };
      }

      await createLevelFeatureUnlock({
        level_required: levelRequired,
        feature_key: featureKey,
        feature_payload: featurePayload,
      });

      playSound("success");
      toast.success(t("featureUnlockCreated"));
      router.push("/admin/level-feature-unlocks");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("genericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout
      label={t("createFeatureUnlockTitle")}
      description={t("createFeatureUnlockDescription")}
      backButton
      className="space-y-4"
    >
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
        <nav className="text-sm text-muted-foreground">
          <Link href="/admin/level-feature-unlocks" className="hover:text-foreground">
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
              <Label htmlFor="feature_key">
                {tf("featureKey")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="feature_key"
                placeholder={tf("featureKeyPlaceholder")}
                value={featureKey}
                required
                onChange={(e) => setFeatureKey(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature_payload">
              {tf("featurePayload")} <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              {tp("payloadIntro")}
            </p>
            <PayloadHintGuide variant="feature" typeOrKey={featureKey} />
            <Textarea
              id="feature_payload"
              rows={6}
              placeholder='{"limit": 20, "types": ["like", "love"]}'
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
            <Button type="button" variant="outline" render={
              <Link href="/admin/level-feature-unlocks">{tc("cancel")}</Link>
            } />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : tp("submit")}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
