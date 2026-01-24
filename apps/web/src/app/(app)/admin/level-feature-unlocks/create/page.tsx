"use client";

import { PayloadHintGuide } from "@/components/admin/payload-hint-guide";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from "@repo/ui/components/kibo-ui/dropzone";
import { AppLayout } from "@/components/layouts/app-layout";
import { getAdminPresignedUpload } from "@/lib/api/admin-media";
import { uploadToS3 } from "@/lib/api/s3";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { toast } from "@repo/ui/components/ui/sonner";
import { useSoundWithSettings } from "@/hooks/audio/use-sound-with-settings";
import { useUserContext } from "@/components/providers/user/user-provider";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const IMAGE_ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function CreateLevelFeatureUnlockPage() {
  const { state } = useUserContext();
  const { play: playSound } = useSoundWithSettings();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [levelRequired, setLevelRequired] = useState<number>(1);
  const [featureKey, setFeatureKey] = useState("");
  const [payloadText, setPayloadText] = useState("{}");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      const t = await state.getToken();
      setToken(t);
    };
    fetchToken();
  }, [state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    let featurePayload: Record<string, unknown>;
    try {
      featurePayload = JSON.parse(payloadText) as Record<string, unknown>;
    } catch {
      toast.error("Invalid JSON in feature payload");
      return;
    }

    if (typeof featurePayload !== "object" || featurePayload === null || Array.isArray(featurePayload)) {
      toast.error("Feature payload must be a JSON object");
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedFile) {
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

      const res = await fetch("/api/admin/level-feature-unlocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          level_required: levelRequired,
          feature_key: featureKey,
          feature_payload: featurePayload,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        throw new Error(err.message || err.error || "Failed to create feature unlock");
      }

      playSound("success");
      toast.success("Feature unlock created successfully");
      router.push("/admin/level-feature-unlocks");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout
      label="Create Feature Unlock"
      description="Define a feature that unlocks when users reach a specific level"
      backButton
    >
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
        <nav className="text-sm text-muted-foreground">
          <Link href="/admin/level-feature-unlocks" className="hover:text-foreground">
            Level Feature Unlocks
          </Link>
          <span className="mx-2">/</span>
          <span>Create</span>
        </nav>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level_required">
                Level Required <span className="text-destructive">*</span>
              </Label>
              <Input
                id="level_required"
                type="number"
                min={1}
                placeholder="e.g. 10"
                value={levelRequired}
                required
                onChange={(e) => setLevelRequired(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feature_key">
                Feature Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="feature_key"
                placeholder="e.g. reaction_types, favorite_limit"
                value={featureKey}
                required
                onChange={(e) => setFeatureKey(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feature_payload">
              Feature Payload (JSON) <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              JSON object with feature-specific configuration. Add an optional image below to store
              a media descriptor (resource_type, resource_key, content_type) in the payload.
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
            <Label>Media (optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload an image to attach an S3-backed media descriptor to the payload. Accepted:
              PNG, JPEG, GIF, WebP. Max 5MB.
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
                Clear file
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/level-feature-unlocks">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Unlock"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
