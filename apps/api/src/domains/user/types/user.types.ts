import type { TablesUpdate } from "@ws/database-types";

export type UserUpdate = TablesUpdate<"users">;

export interface UpdateUserCountryBody {
  country: string;
  clerk_user_id: string;
}
