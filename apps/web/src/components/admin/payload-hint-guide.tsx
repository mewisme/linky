"use client";

import { Alert, AlertDescription, AlertTitle } from "@ws/ui/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ws/ui/components/ui/collapsible";
import React, { useState } from "react";

import { Button } from "@ws/ui/components/ui/button";
import { Info } from "lucide-react";

type HintContent = {
  title: string;
  description: string;
  example: string;
  mediaNote: string;
  resourceTypeNote: string;
};

const REWARD_HINTS: Record<string, HintContent> = {
  avatar_frame: {
    title: "avatar_frame reward",
    description: "Unlocks an avatar frame at the given level. Users can equip it on their profile.",
    example: `{
  "frame_key": "gold_rim",
  "display_name": "Gold Frame",
  "media": {
    "resource_type": "s3",
    "resource_key": "admin/rewards/your-uploaded-file.png",
    "content_type": "image/png"
  }
}`,
    mediaNote: "Upload an image above to automatically add a media object with resource_type \"s3\" and resource_key. Media is optional; you can also use resource_type \"static\" with a resource_path for app-bundled assets.",
    resourceTypeNote: "resource_type: \"static\" = app-bundled asset (use resource_path). \"s3\" = file stored in S3 (use resource_key; populated when you upload).",
  },
  badge: {
    title: "badge reward",
    description: "Unlocks a badge displayed on the user profile or in activity.",
    example: `{
  "badge_id": "early_adopter",
  "display_name": "Early Adopter",
  "media": {
    "resource_type": "s3",
    "resource_key": "admin/rewards/badge.png",
    "content_type": "image/png"
  }
}`,
    mediaNote: "Upload an image to attach an S3-backed media descriptor. The payload will reference the file via resource_type and resource_key. Media is optional.",
    resourceTypeNote: "resource_type: \"static\" = app-bundled path. \"s3\" = uploaded file (resource_key points to the S3 object).",
  },
  currency: {
    title: "currency reward",
    description: "Grants in-app currency when the user reaches this level.",
    example: `{
  "amount": 100,
  "currency_key": "coins"
}`,
    mediaNote: "Currency rewards typically do not use media. If you need an icon, you can add an optional media descriptor with resource_type \"static\" or \"s3\".",
    resourceTypeNote: "resource_type: \"static\" = app path. \"s3\" = uploaded file. Usually not used for currency.",
  },
  cosmetic_unlock: {
    title: "cosmetic_unlock reward",
    description: "Unlocks a cosmetic item (theme, border, effect) at the given level.",
    example: `{
  "item_key": "theme_dark",
  "display_name": "Dark Theme",
  "media": {
    "resource_type": "s3",
    "resource_key": "admin/rewards/theme-preview.png",
    "content_type": "image/png"
  }
}`,
    mediaNote: "Upload an image to add an S3-backed media descriptor. The payload references the file via resource_type and resource_key. Media is optional.",
    resourceTypeNote: "resource_type: \"static\" = app-bundled. \"s3\" = uploaded file (resource_key set when you upload).",
  },
};

const FEATURE_HINTS: Record<string, HintContent> = {
  reaction_types: {
    title: "reaction_types",
    description: "Configures which reaction types are available. The payload is configuration, not a boolean toggle; the app reads these values at runtime.",
    example: `{
  "types": ["like", "love", "celebrate"],
  "max_per_user": 5
}`,
    mediaNote: "Reaction types usually do not use media. If a custom reaction needs an icon, add an optional media object with resource_type \"s3\" or \"static\".",
    resourceTypeNote: "resource_type: \"static\" = app path. \"s3\" = uploaded file. Optional for this feature.",
  },
  favorite_limit: {
    title: "favorite_limit",
    description: "Configures how many favorites a user can have. The payload holds the numeric limit and any extra options.",
    example: `{
  "limit": 20
}`,
    mediaNote: "favorite_limit does not use media. Media is optional and only needed if you add custom UI assets (resource_type \"static\" or \"s3\").",
    resourceTypeNote: "resource_type: \"static\" or \"s3\" only if you attach a custom asset; otherwise omit media.",
  },
  streak_freeze: {
    title: "streak_freeze",
    description: "Configures streak freeze behavior: how many freezes, how to earn or spend them. The payload is configuration, not a simple on/off.",
    example: `{
  "max_freezes": 2,
  "cost_in_coins": 100
}`,
    mediaNote: "Optional: add media with resource_type \"s3\" or \"static\" if you need an icon for the freeze in the UI.",
    resourceTypeNote: "resource_type: \"static\" = app path. \"s3\" = uploaded file. Optional.",
  },
  ui_customization: {
    title: "ui_customization",
    description: "Configures UI customization options (themes, layout, compact mode). Different keys can require different payload shapes.",
    example: `{
  "themes": ["light", "dark", "system"],
  "show_compact_mode": true
}`,
    mediaNote: "Upload an image to attach an S3-backed asset (e.g. custom theme preview). The payload will reference it via resource_type and resource_key. Media is optional.",
    resourceTypeNote: "resource_type: \"static\" = app-bundled. \"s3\" = uploaded file (resource_key set when you upload).",
  },
};

const GENERIC_REWARD_HINT: HintContent = {
  title: "Reward payload",
  description: "Use a JSON object with keys relevant to your reward type. Structure depends on how the app consumes this reward.",
  example: `{
  "key": "value"
}`,
  mediaNote: "Media is optional. Upload an image above to add a media descriptor (resource_type \"s3\", resource_key) automatically. For app-bundled assets use resource_type \"static\" and resource_path.",
  resourceTypeNote: "resource_type: \"static\" = app-bundled path. \"s3\" = file stored in S3 (resource_key points to the object; set automatically when you upload).",
};

const GENERIC_FEATURE_HINT: HintContent = {
  title: "Feature payload",
  description: "feature_payload is configuration the app reads for this feature, not a boolean. Use a JSON object; the shape depends on the feature.",
  example: `{
  "option": "value"
}`,
  mediaNote: "Media is optional. Upload an image to add an S3-backed descriptor (resource_type, resource_key). The payload will reference the file; you can also use resource_type \"static\" for app paths.",
  resourceTypeNote: "resource_type: \"static\" = app path. \"s3\" = uploaded file (resource_key filled when you upload).",
};

function getRewardHint(type: string): HintContent {
  const key = type.trim().toLowerCase();
  return key ? (REWARD_HINTS[key] ?? GENERIC_REWARD_HINT) : GENERIC_REWARD_HINT;
}

function getFeatureHint(key: string): HintContent {
  const k = key.trim().toLowerCase();
  return k ? (FEATURE_HINTS[k] ?? GENERIC_FEATURE_HINT) : GENERIC_FEATURE_HINT;
}

function HintBlock({ content }: { content: HintContent }) {
  return (
    <div className="space-y-3">
      <Alert className="border-muted bg-muted/30">
        <Info className="h-4 w-4" />
        <AlertTitle>{content.title}</AlertTitle>
        <AlertDescription>
          <div className="space-y-3 pt-1">
            <p>{content.description}</p>
            <div>
              <p className="mb-1.5 font-medium text-foreground text-xs">Example (copyable):</p>
              <pre
                className="overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs"
                aria-label="Example JSON"
              >
                {content.example}
              </pre>
            </div>
            <p className="text-xs">
              <span className="font-medium text-foreground">Media: </span>
              {content.mediaNote}
            </p>
            <p className="text-xs">
              <span className="font-medium text-foreground">resource_type: </span>
              {content.resourceTypeNote}
            </p>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export type PayloadHintGuideVariant = "reward" | "feature";

export interface PayloadHintGuideProps {
  variant: PayloadHintGuideVariant;
  typeOrKey: string;
}

export function PayloadHintGuide({ variant, typeOrKey }: PayloadHintGuideProps) {
  const [open, setOpen] = useState(false);

  const content =
    variant === "reward"
      ? getRewardHint(typeOrKey)
      : getFeatureHint(typeOrKey);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-auto px-0 text-muted-foreground hover:text-foreground">
          {open ? "Hide guide" : "Show guide"}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-2">
          <HintBlock content={content} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
