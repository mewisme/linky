/* eslint-disable @typescript-eslint/no-namespace */

import type { CallHistoryRecord, CallHistoryResponse } from "./call-history.types";

import type { ApiError } from "./api.types";

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
}
