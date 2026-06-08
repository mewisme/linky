/* eslint-disable @typescript-eslint/no-namespace */

import type { ApiUserMessage } from "@/shared/types/api-message.types";

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

  export namespace UpdateClerkUser {
    export interface PathParams {
      id: string;
    }

    export interface Body {
      password?: string;
      skip_password_checks?: boolean;
      sign_out_of_other_sessions?: boolean;
    }

    export type Response = Record<string, unknown>;
  }

  export namespace SetClerkPasswordCompromised {
    export interface PathParams {
      id: string;
    }

    export interface Body {
      revoke_all_sessions?: boolean;
    }

    export type Response = Record<string, unknown>;
  }

  export namespace UnsetClerkPasswordCompromised {
    export interface PathParams {
      id: string;
    }

    export type Response = Record<string, unknown>;
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
      updated: number;
    }
  }

  export namespace DeleteUsersBatch {
    export interface Body {
      ids: string[];
    }
    export interface Response {
      deleted: number;
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

  export namespace Broadcasts {
    export type AiBroadcastTone = "friendly" | "professional" | "direct";

    export interface AiBroadcastDraftPrimary {
      title: string;
      body: string;
      cta: string;
    }

    export interface AiBroadcastToneVariant extends AiBroadcastDraftPrimary {
      tone: AiBroadcastTone;
    }

    export interface AiBroadcastDraft {
      primary: AiBroadcastDraftPrimary;
      tone_variants: AiBroadcastToneVariant[];
    }

    export namespace AiGenerate {
      export interface Body {
        audience: string;
        key_points: string;
      }

      export interface Response {
        draft: AiBroadcastDraft;
      }
    }

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
        userMessage?: ApiUserMessage;
      }
    }
  }

  export namespace Reports {
    export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

    export type AiSummaryStatus = "pending" | "ready" | "failed";
    export type AiSummarySeverity = "low" | "medium" | "high" | "critical";

    export interface AiSummary {
      report_id: string;
      status: AiSummaryStatus;
      summary: string | null;
      severity: AiSummarySeverity | null;
      suggested_action: string | null;
      model: string | null;
      prompt_version: string | null;
      raw_json: unknown | null;
      error_message: string | null;
      created_at: string;
      updated_at: string;
    }

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
      reporter_first_name: string | null;
      reporter_last_name: string | null;
      reporter_avatar_url: string | null;
      reporter_email: string | null;
      reported_first_name: string | null;
      reported_last_name: string | null;
      reported_avatar_url: string | null;
      reported_email: string | null;
      reviewed_by_first_name: string | null;
      reviewed_by_last_name: string | null;
      reviewed_by_avatar_url: string | null;
      context?: ReportContext | null;
      ai_summary?: AiSummary | null;
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

  export namespace ExpBonuses {
    export type ExpBonusType = "streak" | "level" | "favorite";

    export type ExpBonusRelation = "mutual" | "one_way";

    export interface ExpBonusConfig {
      min?: number;
      max?: number;
      relation?: ExpBonusRelation;
    }

    export interface ExpBonus {
      id: string;
      bonus_multiplier: number;
      type: ExpBonusType;
      config: ExpBonusConfig;
      created_at: string;
      updated_at: string;
    }

    export namespace Get {
      export interface QueryParams {
        limit?: number;
        offset?: number;
      }

      export interface Response {
        data: ExpBonus[];
      }
    }

    export namespace GetById {
      export interface PathParams {
        id: string;
      }

      export type Response = ExpBonus;
    }

    export namespace Create {
      export interface Body {
        bonus_multiplier: number;
        type: ExpBonusType;
        config: ExpBonusConfig;
      }

      export type Response = ExpBonus;
    }

    export namespace Update {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        bonus_multiplier?: number;
        type?: ExpBonusType;
        config?: ExpBonusConfig;
      }

      export type Response = ExpBonus;
    }

    export namespace Patch {
      export interface PathParams {
        id: string;
      }

      export interface Body {
        bonus_multiplier?: number;
        type?: ExpBonusType;
        config?: ExpBonusConfig;
      }

      export type Response = ExpBonus;
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

  export namespace AI {
    export interface ChatModels {
      broadcast?: string;
      report_summary?: string;
    }

    export interface ModelsConfig {
      chat?: ChatModels;
      embedding?: string;
      image?: string;
      tts?: string;
      stt?: string;
      web_search?: string;
      web_fetch?: string;
    }

    export interface TimeoutsConfig {
      request_ms?: number;
      embedding_ms?: number;
    }

    export interface EmbeddingJobConfig {
      user_api_batch_size?: number;
      dimension?: number;
    }

    export interface Settings {
      base_url?: string;
      api_key?: string;
      api_key_configured?: boolean;
      models?: ModelsConfig;
      timeouts?: TimeoutsConfig;
      embedding?: EmbeddingJobConfig;
    }

    export interface Effective extends Settings {
      base_url: string;
      models: Required<Pick<ModelsConfig, "chat">> & ModelsConfig & {
        chat: Required<ChatModels>;
      };
    }

    export interface ModelEntry {
      id: string;
      object?: string;
      owned_by?: string;
      kind?: string;
    }

    export namespace Config {
      export interface Response {
        key: string;
        admin: Settings | null;
        effective: Record<string, unknown>;
        env_defaults: Record<string, unknown>;
        has_admin_config: boolean;
        api_key_configured: boolean;
      }

      export interface PutBody {
        value: Settings;
      }

      export type PutResponse = {
        key: string;
        effective: Record<string, unknown>;
        api_key_configured: boolean;
      };
    }

    export namespace Models {
      export type Capability =
        | "chat"
        | "embedding"
        | "image"
        | "tts"
        | "stt"
        | "web_search"
        | "web_fetch";

      export interface QueryParams {
        capability?: Capability;
      }

      export interface SingleResponse {
        capability: string;
        object: string;
        data: ModelEntry[];
      }

      export interface AllResponse {
        capabilities: Record<
          string,
          { object: string; data: ModelEntry[] }
        >;
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
