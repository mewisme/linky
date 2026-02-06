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

export interface BlockUserBody {
  blocked_user_id: string;
}
