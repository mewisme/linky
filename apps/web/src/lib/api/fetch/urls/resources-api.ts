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

  interestTagById(id: string) {
    return this.buildUrl('/api/resources/interest-tags/:id', { pathParams: { id } });
  }
}
