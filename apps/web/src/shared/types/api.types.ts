/* eslint-disable @typescript-eslint/no-namespace */
import type { BackendUserMessage } from "@ws/shared-types";

export interface ApiError {
  error: string;
  message: string;
  userMessage?: BackendUserMessage;
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

