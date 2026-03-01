export type NotificationType =
  | "favorite_added"
  | "level_up"
  | "streak_milestone"
  | "streak_expiring"
  | "admin_broadcast";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
}

export interface UnreadCountResponse {
  count: number;
}

export interface BlockRecord {
  id: string;
  blocker_user_id: string;
  blocked_user_id: string;
  created_at: string;
}

export interface BlockedUserWithDetails {
  id: string;
  blocked_user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
}

export interface BlockedUsersResponse {
  blocked_users: BlockedUserWithDetails[];
}

export interface VapidPublicKeyResponse {
  publicKey: string;
}

export interface PushSubscriptionBody {
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}
