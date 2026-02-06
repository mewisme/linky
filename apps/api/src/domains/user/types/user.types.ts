import type { TablesUpdate } from "@/types/database/supabase.types.js";

export type UserUpdate = TablesUpdate<"users">;

export interface UpdateUserCountryBody {
  country: string;
  clerk_user_id: string;
}
