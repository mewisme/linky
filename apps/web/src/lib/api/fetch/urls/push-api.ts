import { BaseApiUrl } from './base-api-url';

export class PushApi extends BaseApiUrl {
  subscribe() {
    return this.buildUrl('/api/push/subscribe');
  }

  unsubscribe() {
    return this.buildUrl('/api/push/unsubscribe');
  }

  vapidPublicKey() {
    return this.buildUrl('/api/push/vapid-public-key');
  }
}
