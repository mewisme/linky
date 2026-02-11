import { BaseApiUrl } from './base-api-url';

export class ResourcesApi extends BaseApiUrl {
  changelogs(params?: URLSearchParams) {
    return this.buildUrl('/api/resources/changelogs', params);
  }

  changelogByVersion(version: string) {
    return this.buildUrl('/api/resources/changelogs/:version', { pathParams: { version } });
  }

  callHistory(params?: URLSearchParams) {
    return this.buildUrl('/api/resources/call-history', params);
  }

  callHistoryById(id: string) {
    return this.buildUrl('/api/resources/call-history/:id', { pathParams: { id } });
  }

  favorites(params?: URLSearchParams) {
    return this.buildUrl('/api/resources/favorites', params);
  }

  favoriteByUserId(userId: string) {
    return this.buildUrl('/api/resources/favorites/:userId', { pathParams: { userId } });
  }

  interestTags(params?: URLSearchParams) {
    return this.buildUrl('/api/resources/interest-tags', params);
  }

  interestTagById(id: string) {
    return this.buildUrl('/api/resources/interest-tags/:id', { pathParams: { id } });
  }

  reports(params?: URLSearchParams) {
    return this.buildUrl('/api/resources/reports', params);
  }

  reportsMe() {
    return this.buildUrl('/api/resources/reports/me');
  }
}
