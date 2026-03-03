import type { TablesInsert, TablesUpdate } from "@/types/database/supabase.types.js";

export type AdminInterestTagInsert = TablesInsert<"interest_tags">;
export type AdminInterestTagUpdate = TablesUpdate<"interest_tags">;

export interface InterestTagsImportItem {
  display_name: string;
  category?: string;
  icon?: string;
  description?: string;
  is_active?: boolean;
}

export interface InterestTagsImportRequestBody {
  items: InterestTagsImportItem[];
}

export interface InterestTagsImportResponse {
  total: number;
  created: number;
  updated: number;
  skipped_invalid: number;
}

export type AdminUserUpdate = TablesUpdate<"users">;

export interface AdminUserDetails {
  bio: string | null;
  gender: string | null;
  date_of_birth: string | null;
}

export interface AdminUserEmbeddingMetadata {
  model: string | null;
  source_hash: string;
  updated_at: string;
}

export type AdminRole = "admin" | "member" | "superadmin";

export interface GetUsersQuery {
  getAll: boolean;
  page: number;
  limit: number;
  role?: AdminRole;
  deleted: boolean;
  search?: string;
}

export interface AdminUnifiedUser {
  id: string;
  clerk_user_id: string;
  email: string | null;
  role: AdminRole;
  deleted: boolean | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  country: string | null;
  updated_at: string;
  deleted_at: string | null;
  details: AdminUserDetails | null;
  interest_tag_names: string[];
  embedding: AdminUserEmbeddingMetadata | null;
  level: number;
}

