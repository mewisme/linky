/* eslint-disable @typescript-eslint/no-namespace */

export namespace MediaAPI {
  export namespace IceServers {
    export namespace Get {
      export interface IceServer {
        urls: string[];
        username: string;
        credential: string;
      }

      export interface Response {
        iceServers: IceServer[];
      }
    }

    export namespace GetDual {
      export interface Response {
        staticIceServers: RTCIceServer[];
        cloudflareIceServers: RTCIceServer[];
      }
    }
  }

  export namespace S3 {
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
}
