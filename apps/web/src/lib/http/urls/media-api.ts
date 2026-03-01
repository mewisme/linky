import { BaseApiUrl } from './base-api-url';

export class MediaApi extends BaseApiUrl {
  iceServers() {
    return this.buildUrl('/api/media/ice-servers');
  }

  s3Objects(params?: URLSearchParams) {
    return this.buildUrl('/api/media/s3/objects', params);
  }

  s3ObjectByKey(key: string) {
    return this.buildUrl('/api/media/s3/objects/:key', { pathParams: { key } });
  }

  s3PresignedUpload() {
    return this.buildUrl('/api/media/s3/presigned/upload');
  }

  s3PresignedDownload() {
    return this.buildUrl('/api/media/s3/presigned/download');
  }

  s3MultipartStart() {
    return this.buildUrl('/api/media/s3/multipart/start');
  }

  s3MultipartPart(uploadId: string, partNumber: number) {
    return this.buildUrl('/api/media/s3/multipart/:uploadId/part/:partNumber', {
      pathParams: { uploadId, partNumber },
    });
  }

  s3MultipartComplete() {
    return this.buildUrl('/api/media/s3/multipart/complete');
  }

  s3MultipartAbort() {
    return this.buildUrl('/api/media/s3/multipart/abort');
  }
}
