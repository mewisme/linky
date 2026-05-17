import type { TablesUpdate } from "@ws/database-types";

export const BIO_MAX_LENGTH = 300;

export type UserDetailsUpdate = TablesUpdate<"user_details">;

export interface InterestTagsBody {
  tagIds: string[];
}

