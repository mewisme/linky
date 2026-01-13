/* eslint-disable @typescript-eslint/no-namespace */

import type { ApiError } from "./api.types";

export namespace AdminAPI {
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
  }
}
