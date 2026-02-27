import { BaseApiUrl } from './base-api-url';

export class AdminApi extends BaseApiUrl {
  mediaPresignedUpload() {
    return this.buildUrl('/api/admin/media/presigned-upload');
  }
}
