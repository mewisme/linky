export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  payload: unknown;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | "favorite_added"
  | "level_up"
  | "streak_milestone"
  | "streak_expiring"
  | "admin_broadcast";

export interface FavoriteAddedPayload {
  from_user_id: string;
  from_user_name: string;
}

export interface LevelUpPayload {
  new_level: number;
}

export interface StreakMilestonePayload {
  days: number;
}

export interface StreakExpiringPayload {
  expires_in_hours: number;
}

export interface AdminBroadcastPayload {
  message: string;
  title?: string;
  url?: string;
}

export type NotificationPayload =
  | FavoriteAddedPayload
  | LevelUpPayload
  | StreakMilestonePayload
  | StreakExpiringPayload
  | AdminBroadcastPayload;
