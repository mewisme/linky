export interface MultipartStartResult {
  uploadId: string;
}

export interface UploadPartResult {
  partNumber: number;
  etag: string;
}

