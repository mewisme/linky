import type { Tables } from "@/types/database/supabase.types.js";

export type UserProfileAggregate = {
  user: Tables<"users">;
  details: unknown | null;
  settings: Tables<"user_settings"> | null;
};

