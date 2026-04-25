"use client";

import { Alert, AlertDescription, AlertTitle } from "@ws/ui/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ws/ui/components/ui/collapsible";
import React, { useMemo, useState } from "react";

import { Button } from "@ws/ui/components/ui/button";
import { Info } from "@ws/ui/internal-lib/icons";
import { useTranslations } from "next-intl";

const REWARD_EXAMPLES: Record<string, string> = {
  avatar_frame: `{
  "frame_key": "gold_rim",
  "display_name": "Gold Frame",
  "media": {
    "resource_type": "s3",
    "resource_key": "admin/rewards/your-uploaded-file.png",
    "content_type": "image/png"
  }
}`,
  badge: `{
  "badge_id": "early_adopter",
  "display_name": "Early Adopter",
  "media": {
    "resource_type": "s3",
    "resource_key": "admin/rewards/badge.png",
    "content_type": "image/png"
  }
}`,
  currency: `{
  "amount": 100,
  "currency_key": "coins"
}`,
  cosmetic_unlock: `{
  "item_key": "theme_dark",
  "display_name": "Dark Theme",
  "media": {
    "resource_type": "s3",
    "resource_key": "admin/rewards/theme-preview.png",
    "content_type": "image/png"
  }
}`,
};

const FEATURE_EXAMPLES: Record<string, string> = {
  reaction_types: `{
  "types": ["like", "love", "celebrate"],
  "max_per_user": 5
}`,
  favorite_limit: `{
  "limit": 20
}`,
  streak_freeze: `{
  "max_freezes": 2,
  "cost_in_coins": 100
}`,
  ui_customization: `{
  "themes": ["light", "dark", "system"],
  "show_compact_mode": true
}`,
};

const GENERIC_REWARD_EXAMPLE = `{
  "key": "value"
}`;

const GENERIC_FEATURE_EXAMPLE = `{
  "option": "value"
}`;

function getRewardExample(type: string): string {
  const k = type.trim().toLowerCase();
  return REWARD_EXAMPLES[k] ?? GENERIC_REWARD_EXAMPLE;
}

function getFeatureExample(key: string): string {
  const k = key.trim().toLowerCase();
  return FEATURE_EXAMPLES[k] ?? GENERIC_FEATURE_EXAMPLE;
}

type HintFields = {
  title: string;
  description: string;
  mediaNote: string;
  resourceTypeNote: string;
  example: string;
};

function rewardHintFields(t: (key: string) => string, type: string): HintFields {
  const k = type.trim().toLowerCase();
  const example = getRewardExample(type);
  switch (k) {
    case "avatar_frame":
      return {
        title: t("rewards.avatar_frame.title"),
        description: t("rewards.avatar_frame.description"),
        mediaNote: t("rewards.avatar_frame.mediaNote"),
        resourceTypeNote: t("rewards.avatar_frame.resourceTypeNote"),
        example,
      };
    case "badge":
      return {
        title: t("rewards.badge.title"),
        description: t("rewards.badge.description"),
        mediaNote: t("rewards.badge.mediaNote"),
        resourceTypeNote: t("rewards.badge.resourceTypeNote"),
        example,
      };
    case "currency":
      return {
        title: t("rewards.currency.title"),
        description: t("rewards.currency.description"),
        mediaNote: t("rewards.currency.mediaNote"),
        resourceTypeNote: t("rewards.currency.resourceTypeNote"),
        example,
      };
    case "cosmetic_unlock":
      return {
        title: t("rewards.cosmetic_unlock.title"),
        description: t("rewards.cosmetic_unlock.description"),
        mediaNote: t("rewards.cosmetic_unlock.mediaNote"),
        resourceTypeNote: t("rewards.cosmetic_unlock.resourceTypeNote"),
        example,
      };
    default:
      return {
        title: t("genericReward.title"),
        description: t("genericReward.description"),
        mediaNote: t("genericReward.mediaNote"),
        resourceTypeNote: t("genericReward.resourceTypeNote"),
        example,
      };
  }
}

function featureHintFields(t: (key: string) => string, key: string): HintFields {
  const k = key.trim().toLowerCase();
  const example = getFeatureExample(key);
  switch (k) {
    case "reaction_types":
      return {
        title: t("features.reaction_types.title"),
        description: t("features.reaction_types.description"),
        mediaNote: t("features.reaction_types.mediaNote"),
        resourceTypeNote: t("features.reaction_types.resourceTypeNote"),
        example,
      };
    case "favorite_limit":
      return {
        title: t("features.favorite_limit.title"),
        description: t("features.favorite_limit.description"),
        mediaNote: t("features.favorite_limit.mediaNote"),
        resourceTypeNote: t("features.favorite_limit.resourceTypeNote"),
        example,
      };
    case "streak_freeze":
      return {
        title: t("features.streak_freeze.title"),
        description: t("features.streak_freeze.description"),
        mediaNote: t("features.streak_freeze.mediaNote"),
        resourceTypeNote: t("features.streak_freeze.resourceTypeNote"),
        example,
      };
    case "ui_customization":
      return {
        title: t("features.ui_customization.title"),
        description: t("features.ui_customization.description"),
        mediaNote: t("features.ui_customization.mediaNote"),
        resourceTypeNote: t("features.ui_customization.resourceTypeNote"),
        example,
      };
    default:
      return {
        title: t("genericFeature.title"),
        description: t("genericFeature.description"),
        mediaNote: t("genericFeature.mediaNote"),
        resourceTypeNote: t("genericFeature.resourceTypeNote"),
        example,
      };
  }
}

function HintBlock({
  title,
  description,
  example,
  mediaNote,
  resourceTypeNote,
  exampleCopyable,
  mediaHeading,
  resourceTypeHeading,
  exampleAria,
}: {
  title: string;
  description: string;
  example: string;
  mediaNote: string;
  resourceTypeNote: string;
  exampleCopyable: string;
  mediaHeading: string;
  resourceTypeHeading: string;
  exampleAria: string;
}) {
  return (
    <div className="space-y-3">
      <Alert className="border-muted bg-muted/30">
        <Info className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <div className="space-y-3 pt-1">
            <p>{description}</p>
            <div>
              <p className="mb-1.5 font-medium text-foreground text-xs">{exampleCopyable}</p>
              <pre
                className="overflow-x-auto rounded-md border bg-muted/50 p-3 font-mono text-xs"
                aria-label={exampleAria}
              >
                {example}
              </pre>
            </div>
            <p className="text-xs">
              <span className="font-medium text-foreground">{mediaHeading} </span>
              {mediaNote}
            </p>
            <p className="text-xs">
              <span className="font-medium text-foreground">{resourceTypeHeading}</span>
              {resourceTypeNote}
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
  const t = useTranslations("admin.payloadGuide");

  const tf = t as unknown as (key: string) => string;

  const hint = useMemo(() => {
    if (variant === "reward") {
      return rewardHintFields(tf, typeOrKey);
    }
    return featureHintFields(tf, typeOrKey);
  }, [variant, typeOrKey, tf]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger render={
        <Button type="button" variant="ghost" size="sm" className="h-auto px-0 text-muted-foreground hover:text-foreground">
          {open ? t("hideGuide") : t("showGuide")}
        </Button>
      } />
      <CollapsibleContent>
        <div className="pt-2">
          <HintBlock
            title={hint.title}
            description={hint.description}
            example={hint.example}
            mediaNote={hint.mediaNote}
            resourceTypeNote={hint.resourceTypeNote}
            exampleCopyable={t("exampleCopyable")}
            mediaHeading={t("mediaHeading")}
            resourceTypeHeading={t("resourceTypeHeading")}
            exampleAria={t("exampleJsonAria")}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
