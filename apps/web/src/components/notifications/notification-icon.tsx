"use client";

import {
  IconBell,
  IconFlame,
  IconSpeakerphone,
  IconStar,
  IconTrophy,
} from "@tabler/icons-react";

import type { NotificationType } from "@/types/notifications.types";

const iconMap: Record<NotificationType, React.ElementType> = {
  favorite_added: IconStar,
  level_up: IconTrophy,
  streak_milestone: IconFlame,
  streak_expiring: IconFlame,
  admin_broadcast: IconSpeakerphone,
};

const colorMap: Record<NotificationType, string> = {
  favorite_added: "text-yellow-500",
  level_up: "text-purple-500",
  streak_milestone: "text-orange-500",
  streak_expiring: "text-red-500",
  admin_broadcast: "text-blue-500",
};

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
}

export function NotificationIcon({ type, className }: NotificationIconProps) {
  const Icon = iconMap[type] || IconBell;
  const color = colorMap[type] || "text-muted-foreground";

  return <Icon className={`size-5 ${color} ${className || ""}`} />;
}
