import type { TablesInsert, TablesUpdate } from "../../../types/database/supabase.types.js";

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

