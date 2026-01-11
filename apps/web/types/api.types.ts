/* eslint-disable @typescript-eslint/no-namespace */
export interface ApiError {
  error: string;
  message: string;
}

export namespace S3API {
  export namespace GetUploadUrl {
    export interface QueryParams {
      key: string;
      expires?: number;
    }

    export interface Response {
      url: string;
      key: string;
      expiresIn: number;
      method: "PUT";
    }
  }

  export namespace GetDownloadUrl {
    export interface QueryParams {
      key: string;
      expires?: number;
    }

    export interface Response {
      url: string;
      key: string;
      expiresIn: number;
      method: "GET";
    }
  }

  export namespace ListObjects {
    export interface QueryParams {
      prefix?: string;
    }

    export interface S3Object {
      key: string;
      size: number;
      lastModified: Date;
      etag: string;
    }

    export interface Response {
      objects: S3Object[];
      prefix?: string;
      isTruncated: boolean;
    }
  }

  export namespace DeleteObject {
    export interface PathParams {
      key: string;
    }

    export interface Response {
      success: true;
      message: string;
      key: string;
    }
  }

  export namespace StartMultipart {
    export interface Body {
      key: string;
    }

    export interface Response {
      uploadId: string;
      key: string;
    }
  }

  export namespace GetPartUploadUrl {
    export interface PathParams {
      uploadId: string;
      partNumber: string;
    }

    export interface QueryParams {
      key: string;
    }

    export interface Response {
      url: string;
      uploadId: string;
      partNumber: number;
      key: string;
    }
  }

  export namespace CompleteMultipart {
    export interface Part {
      partNumber: number;
      etag: string;
    }

    export interface Body {
      key: string;
      uploadId: string;
      parts: Part[];
    }

    export interface Response {
      success: true;
      message: string;
      key: string;
      uploadId: string;
    }
  }

  export namespace AbortMultipart {
    export interface Body {
      key: string;
      uploadId: string;
    }

    export interface Response {
      success: true;
      message: string;
      key: string;
      uploadId: string;
    }
  }
}

export namespace AdminAPI {
  export type UserRole = "admin" | "member";
  export type PresenceState = "offline" | "online" | "available" | "matching" | "in_call" | "idle";

  export interface User {
    id: string;
    clerk_user_id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    allow: boolean;
    presence: PresenceState;
    created_at: string;
    updated_at: string;
  }

  export namespace GetAnalytics {
    export interface QueryParams {
      days?: number;
    }

    export interface TimeseriesDataPoint {
      day: string;
      views: number;
    }

    export interface VisitorsTimeseriesDataPoint {
      day: string;
      visitors: number;
    }

    export interface Response {
      overview: {
        totalPageViews: number;
        totalVisitors: number;
      };
      timeseries: {
        pageViews: TimeseriesDataPoint[];
        visitors: VisitorsTimeseriesDataPoint[];
        days: number;
      };
    }
  }

  export namespace GetUsers {
    export interface QueryParams {
      page?: number;
      limit?: number;
      role?: UserRole;
      allow?: boolean | string;
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
      allow?: boolean;
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
      allow?: boolean;
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
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiRequestConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
}

