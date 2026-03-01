/* eslint-disable @typescript-eslint/no-namespace */

import type { CallHistoryRecord, CallHistoryResponse } from "@/entities/call-history/types/call-history.types";

export namespace ResourcesAPI {
  export namespace CallHistory {
    export namespace Get {
      export interface QueryParams {
        limit?: number;
        offset?: number;
      }

      export type Response = CallHistoryResponse;
    }

    export namespace GetById {
      export interface PathParams {
        id: string;
      }

      export type Response = CallHistoryRecord;
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
  }

  export namespace Changelogs {
    export interface Changelog {
      id: string;
      version: string;
      title: string;
      release_date: string;
      s3_key: string;
      created_by: string;
      is_published: boolean;
      order: number | null;
      created_at: string;
      updated_at: string;
    }

    export interface ChangelogWithDownloadUrl extends Changelog {
      download_url: string | null;
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

    export namespace GetByVersion {
      export interface PathParams {
        version: string;
      }

      export type Response = ChangelogWithDownloadUrl;
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

    export namespace Create {
      export interface Body {
        reported_user_id: string;
        reason: string;
        call_id?: string;
        room_id?: string;
        behavior_flags?: {
          call_metadata?: {
            reporter_muted?: boolean;
            reported_muted?: boolean;
            reporter_video_off?: boolean;
            reported_video_off?: boolean;
            call_ended_by?: "reporter" | "reported" | "system";
            end_type?: "end-call" | "skip" | "disconnect";
          };
          reporter_flags?: string[];
        };
      }

      export type Response = Report;
    }

    export namespace GetMe {
      export interface QueryParams {
        limit?: number;
        offset?: number;
      }

      export interface Response {
        data: Report[];
        count: number;
        limit: number;
        offset: number;
      }
    }
  }

  export namespace Favorites {
    export interface FavoriteWithStats {
      id: string;
      user_id: string;
      favorite_user_id: string;
      created_at: string;
      clerk_user_id: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
      country: string | null;
      match_count: number;
      total_duration: number;
      average_duration: number;
    }

    export namespace Get {
      export interface Response {
        data: FavoriteWithStats[];
        count: number;
      }
    }

    export namespace Create {
      export interface Body {
        favorite_user_id: string;
      }

      export interface Response {
        data: {
          id: string;
          user_id: string;
          favorite_user_id: string;
          created_at: string;
        };
        message: string;
      }
    }

    export namespace Delete {
      export interface PathParams {
        favorite_user_id: string;
      }

      export interface Response {
        message: string;
        refunded: boolean;
      }
    }
  }
}
