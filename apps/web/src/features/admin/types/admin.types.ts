/* eslint-disable @typescript-eslint/no-namespace */

export namespace AdminAPI {
  export type UserRole = "admin" | "member" | "superadmin";
  export type PresenceState = "offline" | "online" | "available" | "matching" | "in_call" | "idle";

  export interface UserDetails {
    bio: string | null;
    gender: string | null;
    date_of_birth: string | null;
  }

  export interface UserEmbeddingMetadata {
    model: string | null;
    source_hash: string;
    updated_at: string;
  }

  export interface User {
    id: string;
    clerk_user_id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    deleted: boolean | null;
    presence: PresenceState;
    created_at: string;
    updated_at: string;
    details: UserDetails | null;
    interest_tag_names: string[];
    embedding: UserEmbeddingMetadata | null;
    level: number;
  }

  export namespace GetUsers {
    export interface QueryParams {
      page?: number;
      limit?: number;
      role?: UserRole;
      search?: string;
      all?: boolean | string;
    }

    export interface Pagination {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }

    export interface Response {
      data: User[];
      pagination?: Pagination;
    }
  }

  export namespace GetUser {
    export interface PathParams {
      id: string;
    }

    export type Response = User;
  }

  export namespace UpdateUser {
    export interface PathParams {
      id: string;
    }

    export interface Body {
      avatar_url?: string | null;
      clerk_user_id?: string;
      created_at?: string;
      email?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      role?: UserRole;
      updated_at?: string;
    }

    export type Response = User;
  }

  export namespace PatchUser {
    export interface PathParams {
      id: string;
    }

    export interface Body {
      avatar_url?: string | null;
      clerk_user_id?: string;
      created_at?: string;
      deleted?: boolean;
      deleted_at?: string | null;
      email?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      role?: UserRole;
      updated_at?: string;
    }

    export type Response = User;
  }

  export namespace DeleteUser {
    export interface Response {
      success: true;
      message: string;
    }
  }

  export namespace PatchUsersBatch {
    export interface Body {
      ids: string[];
      deleted?: boolean;
      deleted_at?: string | null;
    }
    export interface Response {
      data: User[];
    }
  }

  export namespace DeleteUsersBatch {
    export interface Body {
      ids: string[];
    }
    export interface Response {
      success: true;
      message: string;
    }
  }

  export namespace InterestTags {
    export interface InterestTag {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      category: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    export namespace Get {
      export interface QueryParams {
        category?: string;
        search?: string;
        isActive?: "true" | "false" | "all" | "1" | "0";
        limit?: number;
        offset?: number;
      }

      export interface Pagination {
        limit: number;
        offset: number;
        total: number;
        totalPages: number;
      }

      export interface Response {
        data: InterestTag[];
        pagination: Pagination;
      }
    }

    export namespace GetById {
      export interface PathParams {
        id: string;
      }

      export type Response = InterestTag;
    }

    export namespace Create {
      export interface Body {
        name: string;
        description?: string | null;
        icon?: string | null;
        category?: string | null;
        is_active?: boolean;
      }

      export type Response = InterestTag;
    }

    export namespace Update {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        name?: string;
        description?: string | null;
        icon?: string | null;
        category?: string | null;
        is_active?: boolean;
      }

      export type Response = InterestTag;
    }

    export namespace Patch {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        name?: string;
        description?: string | null;
        icon?: string | null;
        category?: string | null;
        is_active?: boolean;
      }

      export type Response = InterestTag;
    }

    export namespace Delete {
      export interface PathParams {
        id: string;
      }

      export interface Response {
        message: string;
        data: InterestTag;
      }
    }

    export namespace HardDelete {
      export interface PathParams {
        id: string;
      }

      export interface Response {
        message: string;
      }
    }

    export namespace Import {
      export interface Body {
        items: Array<{
          display_name: string;
          category?: string;
          icon?: string;
          description?: string;
          is_active?: boolean;
        }>;
      }

      export interface Response {
        total: number;
        created: number;
        updated: number;
        skipped_invalid: number;
      }
    }
  }

  export namespace Changelogs {
    export interface ChangelogCreator {
      id: string;
      clerk_user_id: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
      country: string | null;
      role: UserRole;
      created_at: string;
      updated_at: string;
    }

    export interface Changelog {
      id: string;
      version: string;
      title: string;
      release_date: string;
      s3_key: string;
      created_by: ChangelogCreator;
      is_published: boolean;
      order: number | null;
      created_at: string;
      updated_at: string;
    }

    export namespace Get {
      export interface QueryParams {
        limit?: number;
        offset?: number;
        order_by?: "release_date" | "order";
      }

      export interface Pagination {
        limit: number;
        offset: number;
        total: number;
        totalPages: number;
      }

      export interface Response {
        data: Changelog[];
        pagination: Pagination;
      }
    }

    export namespace GetById {
      export interface PathParams {
        id: string;
      }

      export type Response = Changelog;
    }

    export namespace Create {
      export interface Body {
        version: string;
        title: string;
        release_date: string;
        s3_key: string;
        is_published?: boolean;
        order?: number | null;
      }

      export type Response = Changelog;
    }

    export namespace Update {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        version?: string;
        title?: string;
        release_date?: string;
        s3_key?: string;
        is_published?: boolean;
        order?: number | null;
      }

      export type Response = Changelog;
    }

    export namespace Patch {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        version?: string;
        title?: string;
        release_date?: string;
        s3_key?: string;
        is_published?: boolean;
        order?: number | null;
      }

      export type Response = Changelog;
    }

    export namespace Delete {
      export interface PathParams {
        id: string;
      }

      export interface Response {
        success: true;
        message: string;
      }
    }
  }

  export namespace Broadcasts {
    export interface HistoryRow {
      id: string;
      created_by_user_id: string;
      title: string | null;
      message: string;
      created_at: string;
      creator_first_name: string | null;
      creator_last_name: string | null;
      creator_email: string | null;
    }

    export namespace Get {
      export interface QueryParams {
        limit?: number;
        offset?: number;
      }

      export interface Pagination {
        limit: number;
        offset: number;
        total: number;
        totalPages: number;
      }

      export interface Response {
        data: HistoryRow[];
        pagination: Pagination;
      }
    }

    export namespace Post {
      export interface Body {
        message: string;
        title?: string;
        deliveryMode?: "push_only" | "push_and_save";
        url?: string;
      }

      export interface Response {
        message: string;
        sent: number;
      }
    }
  }

  export namespace Reports {
    export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

    export interface ReportContext {
      id: string;
      report_id: string;
      call_id: string | null;
      room_id: string | null;
      call_started_at: string | null;
      call_ended_at: string | null;
      duration_seconds: number | null;
      reporter_role: string | null;
      reported_role: string | null;
      ended_by: string | null;
      reported_at_offset_seconds: number | null;
      chat_snapshot: unknown | null;
      behavior_flags: unknown | null;
      created_at: string;
    }

    export interface Report {
      id: string;
      reporter_user_id: string;
      reported_user_id: string;
      reason: string;
      status: ReportStatus;
      admin_notes: string | null;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
      context?: ReportContext | null;
    }

    export namespace Get {
      export interface QueryParams {
        limit?: number;
        offset?: number;
        status?: ReportStatus;
        reporter_user_id?: string;
        reported_user_id?: string;
      }

      export interface Response {
        data: Report[];
        count: number;
        limit: number;
        offset: number;
      }
    }

    export namespace GetById {
      export interface PathParams {
        id: string;
      }

      export type Response = Report;
    }

    export namespace Update {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        status?: ReportStatus;
        admin_notes?: string | null;
      }

      export type Response = Report;
    }
  }

  export namespace LevelRewards {
    export interface LevelReward {
      id: string;
      level_required: number;
      reward_type: string;
      reward_payload: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }

    export namespace Get {
      export interface QueryParams {
        limit?: number;
        offset?: number;
      }

      export interface Response {
        data: LevelReward[];
      }
    }

    export namespace GetById {
      export interface PathParams {
        id: string;
      }

      export type Response = LevelReward;
    }

    export namespace Create {
      export interface Body {
        level_required: number;
        reward_type: string;
        reward_payload: Record<string, unknown>;
      }

      export type Response = LevelReward;
    }

    export namespace Update {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        level_required?: number;
        reward_type?: string;
        reward_payload?: Record<string, unknown>;
      }

      export type Response = LevelReward;
    }

    export namespace Patch {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        level_required?: number;
        reward_type?: string;
        reward_payload?: Record<string, unknown>;
      }

      export type Response = LevelReward;
    }

    export namespace Delete {
      export interface PathParams {
        id: string;
      }

      export interface Response {
        message: string;
      }
    }
  }

  export namespace LevelFeatureUnlocks {
    export interface LevelFeatureUnlock {
      id: string;
      level_required: number;
      feature_key: string;
      feature_payload: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }

    export namespace Get {
      export interface QueryParams {
        limit?: number;
        offset?: number;
      }

      export interface Response {
        data: LevelFeatureUnlock[];
      }
    }

    export namespace GetById {
      export interface PathParams {
        id: string;
      }

      export type Response = LevelFeatureUnlock;
    }

    export namespace Create {
      export interface Body {
        level_required: number;
        feature_key: string;
        feature_payload: Record<string, unknown>;
      }

      export type Response = LevelFeatureUnlock;
    }

    export namespace Update {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        level_required?: number;
        feature_key?: string;
        feature_payload?: Record<string, unknown>;
      }

      export type Response = LevelFeatureUnlock;
    }

    export namespace Patch {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        level_required?: number;
        feature_key?: string;
        feature_payload?: Record<string, unknown>;
      }

      export type Response = LevelFeatureUnlock;
    }

    export namespace Delete {
      export interface PathParams {
        id: string;
      }

      export interface Response {
        message: string;
      }
    }
  }

  export namespace StreakExpBonuses {
    export interface StreakExpBonus {
      id: string;
      min_streak: number;
      max_streak: number;
      bonus_multiplier: number;
      created_at: string;
      updated_at: string;
    }

    export namespace Get {
      export interface QueryParams {
        limit?: number;
        offset?: number;
      }

      export interface Response {
        data: StreakExpBonus[];
      }
    }

    export namespace GetById {
      export interface PathParams {
        id: string;
      }

      export type Response = StreakExpBonus;
    }

    export namespace Create {
      export interface Body {
        min_streak: number;
        max_streak: number;
        bonus_multiplier: number;
      }

      export type Response = StreakExpBonus;
    }

    export namespace Update {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        min_streak?: number;
        max_streak?: number;
        bonus_multiplier?: number;
      }

      export type Response = StreakExpBonus;
    }

    export namespace Patch {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        min_streak?: number;
        max_streak?: number;
        bonus_multiplier?: number;
      }

      export type Response = StreakExpBonus;
    }

    export namespace Delete {
      export interface PathParams {
        id: string;
      }

      export interface Response {
        message: string;
      }
    }
  }

  export namespace Config {
    export interface Item {
      key: string;
      value: string | number | boolean | null | Record<string, unknown> | unknown[];
    }

    export namespace Get {
      export interface Response {
        data: Item[];
      }
    }

    export namespace GetByKey {
      export type Response = Item;
    }

    export namespace Set {
      export interface Body {
        key: string;
        value: string | number | boolean | null | Record<string, unknown> | unknown[];
      }
      export type Response = Item;
    }

    export namespace Unset {
      export interface PathParams {
        key: string;
      }
    }
  }
}
