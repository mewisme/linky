import {
  IconBan,
  IconBell,
  IconBolt,
  IconChartLine,
  IconCode,
  IconFlag,
  IconGift,
  IconHeart,
  IconHistory,
  IconId,
  IconLock,
  IconMessages,
  IconPalette,
  IconSettings,
  IconSettingsCog,
  IconShield,
  IconSpeakerphone,
  IconTags,
  IconUser,
  IconUserShield,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react";

import type { ElementType } from "react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export type MenuItemId =
  | "videoChat"
  | "chat"
  | "callHistory"
  | "connections"
  | "favorites"
  | "blockedUsers"
  | "user"
  | "profile"
  | "security"
  | "progress"
  | "userReports"
  | "userDevelopment"
  | "adminPanel"
  | "adminConfig"
  | "adminBroadcasts"
  | "adminUsers"
  | "adminInterestTags"
  | "adminReports"
  | "adminLevelRewards"
  | "adminFeatureUnlocks"
  | "adminStreakExp"
  | "settings"
  | "settingsAppearance"
  | "settingsNotifications"
  | "settingsDevelopment";

export interface MenuItemDef {
  id: MenuItemId;
  icon: ElementType;
  href?: string;
  isAdmin?: boolean;
  isSuperAdminOnly?: boolean;
  requiresDevelopmentMode?: boolean;
  open?: boolean;
  subItems?: MenuItemDef[];
}

export interface MenuItem {
  id: MenuItemId;
  label: string;
  icon: ElementType;
  description?: string;
  href?: string;
  isAdmin?: boolean;
  isSuperAdminOnly?: boolean;
  requiresDevelopmentMode?: boolean;
  open?: boolean;
  subItems?: MenuItem[];
}

function mapDef(
  def: MenuItemDef,
  tRoot: (key: string) => string,
): MenuItem {
  const description = tRoot(`sidebar.items.${def.id}.description`);
  return {
    id: def.id,
    label: tRoot(`sidebar.items.${def.id}.label`),
    description: description || undefined,
    icon: def.icon,
    href: def.href,
    isAdmin: def.isAdmin,
    isSuperAdminOnly: def.isSuperAdminOnly,
    requiresDevelopmentMode: def.requiresDevelopmentMode,
    open: def.open,
    subItems: def.subItems?.map((s) => mapDef(s, tRoot)),
  };
}

export function buildMenuItems(t: (key: string) => string): MenuItem[] {
  return menuItemDefinitions.map((def) => mapDef(def, t));
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const t = await getTranslations();
  return buildMenuItems(t as (key: string) => string);
}

export function useMenuItems(): MenuItem[] {
  const locale = useLocale();
  const t = useTranslations();
  return useMemo(
    () => buildMenuItems(t as (key: string) => string),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, t],
  );
}

export const menuItemDefinitions: MenuItemDef[] = [
  {
    id: "videoChat",
    icon: IconVideo,
    href: "/call",
  },
  {
    id: "connections",
    icon: IconUsers,
    subItems: [
      {
        id: "favorites",
        icon: IconHeart,
        href: "/connections/favorites",
      },
      {
        id: "blockedUsers",
        icon: IconBan,
        href: "/connections/blocked-users",
      },
      {
        id: "callHistory",
        icon: IconHistory,
        href: "/call/history",
      },
    ],
  },
  {
    id: "user",
    icon: IconUser,
    subItems: [
      {
        id: "profile",
        icon: IconId,
        href: "/user/profile",
      },
      {
        id: "security",
        icon: IconShield,
        href: "/user/security",
      },
      {
        id: "progress",
        icon: IconChartLine,
        href: "/user/progress",
      },
      {
        id: "userReports",
        icon: IconFlag,
        href: "/user/reports",
      },
      {
        id: "userDevelopment",
        icon: IconCode,
        href: "/user/development",
        requiresDevelopmentMode: true,
      },
    ],
  },
  {
    id: "adminPanel",
    icon: IconUserShield,
    href: "/admin",
    isAdmin: true,
    subItems: [
      {
        id: "adminConfig",
        icon: IconSettingsCog,
        href: "/admin/config",
        isSuperAdminOnly: true,
      },
      {
        id: "adminBroadcasts",
        icon: IconSpeakerphone,
        href: "/admin/broadcasts",
      },
      {
        id: "adminUsers",
        icon: IconUsers,
        href: "/admin/users",
      },
      {
        id: "adminInterestTags",
        icon: IconTags,
        href: "/admin/interest-tags",
      },
      {
        id: "adminReports",
        icon: IconFlag,
        href: "/admin/reports",
      },
      {
        id: "adminLevelRewards",
        icon: IconGift,
        href: "/admin/level-rewards",
      },
      {
        id: "adminFeatureUnlocks",
        icon: IconLock,
        href: "/admin/level-feature-unlocks",
      },
      {
        id: "adminStreakExp",
        icon: IconBolt,
        href: "/admin/streak-exp-bonuses",
      },
    ],
  },
  {
    id: "settings",
    icon: IconSettings,
    href: "/settings",
    subItems: [
      {
        id: "settingsAppearance",
        icon: IconPalette,
        href: "/settings/appearance",
      },
      {
        id: "settingsNotifications",
        icon: IconBell,
        href: "/settings/notifications",
      },
      {
        id: "settingsDevelopment",
        icon: IconCode,
        href: "/settings/development",
        isAdmin: true,
      },
    ],
  },
];
