import {
  IconBan,
  IconBell,
  IconBolt,
  IconChartLine,
  IconContract,
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

export interface MenuItem {
  label: string;
  icon: ElementType;
  description?: string;
  category?: string;
  href?: string;
  isAdmin?: boolean;
  isSuperAdminOnly?: boolean;
  open?: boolean;
  subItems?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    label: "Video Chat",
    icon: IconVideo,
    description: "Start a video chat",
    href: "/chat",
    category: "Navigation",
  },
  {
    label: "Chat",
    icon: IconMessages,
    subItems: [
      {
        label: "Call History",
        icon: IconHistory,
        description: "View your call history",
        href: "/chat/call-history",
        category: "Navigation",
      },
    ],
  },
  {
    label: "Connections",
    icon: IconUsers,
    subItems: [
      {
        label: "Favorites",
        icon: IconHeart,
        description: "View your favorites",
        href: "/connections/favorites",
        category: "Account",
      },
      {
        label: "Blocked Users",
        icon: IconBan,
        description: "Manage blocked users",
        href: "/connections/blocked-users",
        category: "Connections",
      },
    ],
  },
  {
    label: "User",
    icon: IconUser,
    subItems: [
      {
        label: "Profile",
        icon: IconId,
        description: "View your profile",
        href: "/user/profile",
        category: "Account",
      },
      {
        label: "Security",
        icon: IconShield,
        description: "View your security settings",
        href: "/user/security",
        category: "Account",
      },
      {
        label: "Progress",
        icon: IconChartLine,
        description: "View your level and streak progress",
        href: "/user/progress",
        category: "Account",
      },
      {
        label: "Reports",
        icon: IconFlag,
        description: "View your reports",
        href: "/user/reports",
        category: "Account",
      },
    ],
  },
  {
    label: "Admin Panel",
    icon: IconUserShield,
    description: "View the admin dashboard",
    href: "/admin",
    isAdmin: true,
    subItems: [
      {
        label: "Configuration",
        icon: IconSettingsCog,
        description: "View the config",
        href: "/admin/config",
        category: "Admin",
      },
      {
        label: "Broadcast Management",
        icon: IconSpeakerphone,
        description: "Send announcements to all users",
        href: "/admin/broadcasts",
        category: "Admin",
      },
      {
        label: "Users Management",
        icon: IconUsers,
        description: "View the users list",
        href: "/admin/users",
        category: "Admin",
      },
      {
        label: "Interest Tags",
        icon: IconTags,
        description: "View the interest tags list",
        href: "/admin/interest-tags",
        category: "Admin",
      },
      {
        label: "Change Logs",
        icon: IconContract,
        description: "Manage the change logs",
        href: "/admin/changelogs",
        category: "Admin",
      },
      {
        label: "Reports",
        icon: IconFlag,
        description: "Manage reports",
        href: "/admin/reports",
        category: "Admin",
      },
      {
        label: "Level Rewards",
        icon: IconGift,
        description: "Manage level rewards",
        href: "/admin/level-rewards",
        category: "Admin",
      },
      {
        label: "Feature Unlocks",
        icon: IconLock,
        description: "Manage level-based feature unlocks",
        href: "/admin/level-feature-unlocks",
        category: "Admin",
      },
      {
        label: "Streak EXP",
        icon: IconBolt,
        description: "Manage streak EXP bonus multipliers",
        href: "/admin/streak-exp-bonuses",
        category: "Admin",
      },
    ],
  },
  {
    label: "Settings",
    icon: IconSettings,
    description: "View the settings",
    href: "/settings",
    category: "Settings",
    subItems: [
      {
        label: "Appearance",
        icon: IconPalette,
        description: "Manage the appearance settings",
        href: "/settings/appearance",
        category: "Settings",
      },
      {
        label: "Notifications",
        icon: IconBell,
        description: "Push notification settings",
        href: "/settings/notifications",
        category: "Settings",
      },
    ],
  },
];
