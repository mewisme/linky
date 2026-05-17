import type { Tables } from "@ws/database-types";

export type UserProfileAggregate = {
  user: Tables<"users">;
  details: unknown | null;
  settings: Tables<"user_settings"> | null;
};

