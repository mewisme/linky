import { BaseApiUrl } from './base-api-url';

export class NotificationsApi extends BaseApiUrl {
  me(params?: URLSearchParams) {
    return this.buildUrl('/api/notifications/me', params);
  }

  unreadCount() {
    return this.buildUrl('/api/notifications/me/unread-count');
  }

  readAll(params?: URLSearchParams) {
    return this.buildUrl('/api/notifications/read-all', params);
  }

  readById(id: string) {
    return this.buildUrl('/api/notifications/:id/read', { pathParams: { id } });
  }
}
