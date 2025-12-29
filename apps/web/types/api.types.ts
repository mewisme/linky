/**
 * API Types for Lockets and S3 Routes
 * Generated from apps/api/src/routes/lockets.ts and apps/api/src/routes/s3.ts
 */

// ============================================================================
// Common Types
// ============================================================================

export interface ApiError {
  error: string;
  message: string;
}

export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  locket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  users: User;
}

export interface Like {
  id: string;
  locket_id: string;
  user_id: string;
  created_at: string;
  users: User;
}

export interface Locket {
  id: string;
  user_id: string;
  image_path: string;
  caption: string | null;
  created_at: string;
  updated_at: string;
  users: User;
  image_url: string | null;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

// ============================================================================
// Lockets API Types
// ============================================================================

export namespace LocketsAPI {
  // GET /api/v1/lockets
  export namespace GetLockets {
    export interface QueryParams {
      offset?: number; // default: 0
      limit?: number; // default: 10, max: 100
      expires?: number; // default: 3600, range: 60-86400
    }

    export interface Pagination {
      offset: number;
      limit: number;
      total: number;
      hasMore: boolean;
    }

    export interface Response {
      data: Locket[];
      pagination: Pagination;
    }
  }

  // GET /api/v1/lockets/:id
  export namespace GetLocket {
    export interface PathParams {
      id: string;
    }

    export interface QueryParams {
      expires?: number; // default: 3600, range: 60-86400
    }

    export type Response = Locket;
  }

  // POST /api/v1/lockets
  export namespace CreateLocket {
    export interface QueryParams {
      expires?: number; // default: 3600, range: 60-86400
    }

    export interface Body {
      image_path: string; // required
      caption?: string | null;
    }

    export type Response = Locket;
  }

  // PUT /api/v1/lockets/:id
  export namespace UpdateLocket {
    export interface PathParams {
      id: string;
    }

    export interface QueryParams {
      expires?: number; // default: 3600, range: 60-86400
    }

    export interface Body {
      image_path?: string;
      caption?: string | null;
    }

    export type Response = Locket;
  }

  // DELETE /api/v1/lockets/:id
  export namespace DeleteLocket {
    export interface PathParams {
      id: string;
    }

    export type Response = void; // 204 No Content
  }
}

// ============================================================================
// S3 API Types
// ============================================================================

export namespace S3API {
  // GET /api/v1/s3/presigned/upload
  export namespace GetUploadUrl {
    export interface QueryParams {
      key: string; // required
      expires?: number; // default: 300
    }

    export interface Response {
      url: string;
      key: string;
      expiresIn: number;
      method: "PUT";
    }
  }

  // GET /api/v1/s3/presigned/download
  export namespace GetDownloadUrl {
    export interface QueryParams {
      key: string; // required
      expires?: number; // default: 300
    }

    export interface Response {
      url: string;
      key: string;
      expiresIn: number;
      method: "GET";
    }
  }

  // GET /api/v1/s3/objects
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

  // DELETE /api/v1/s3/objects/:key
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

  // POST /api/v1/s3/multipart/start
  export namespace StartMultipart {
    export interface Body {
      key: string; // required
    }

    export interface Response {
      uploadId: string;
      key: string;
    }
  }

  // GET /api/v1/s3/multipart/:uploadId/part/:partNumber
  export namespace GetPartUploadUrl {
    export interface PathParams {
      uploadId: string;
      partNumber: string;
    }

    export interface QueryParams {
      key: string; // required
    }

    export interface Response {
      url: string;
      uploadId: string;
      partNumber: number;
      key: string;
    }
  }

  // POST /api/v1/s3/multipart/complete
  export namespace CompleteMultipart {
    export interface Part {
      partNumber: number;
      etag: string;
    }

    export interface Body {
      key: string; // required
      uploadId: string; // required
      parts: Part[]; // required, min length: 1
    }

    export interface Response {
      success: true;
      message: string;
      key: string;
      uploadId: string;
    }
  }

  // POST /api/v1/s3/multipart/abort
  export namespace AbortMultipart {
    export interface Body {
      key: string; // required
      uploadId: string; // required
    }

    export interface Response {
      success: true;
      message: string;
      key: string;
      uploadId: string;
    }
  }
}

// ============================================================================
// Helper Types for API Client
// ============================================================================

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

