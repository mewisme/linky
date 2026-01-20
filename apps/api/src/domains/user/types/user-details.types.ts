import type { TablesUpdate } from "../../../types/database/supabase.types.js";

export type UserDetailsUpdate = TablesUpdate<"user_details">;

export interface InterestTagsBody {
  tagIds: string[];
}

