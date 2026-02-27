import { BaseApiUrl } from './base-api-url';

export class UserApi extends BaseApiUrl {
  me() {
    return this.buildUrl('/api/users/me');
  }

  meCountry() {
    return this.buildUrl('/api/users/me/country');
  }

  details() {
    return this.buildUrl('/api/users/details');
  }

  settings() {
    return this.buildUrl('/api/users/settings');
  }

  progress() {
    return this.buildUrl('/api/users/progress');
  }

  streak() {
    return this.buildUrl('/api/users/streak');
  }

  streakCalendar(params?: URLSearchParams) {
    return this.buildUrl('/api/users/streak/calendar', params);
  }

  users(params?: URLSearchParams) {
    return this.buildUrl('/api/users', params);
  }

  interestTags() {
    return this.buildUrl('/api/users/interest-tags');
  }

  interestTagsAll() {
    return this.buildUrl('/api/users/interest-tags/all');
  }

  blocks() {
    return this.buildUrl('/api/users/blocks');
  }

  blocksMe() {
    return this.buildUrl('/api/users/blocks/me');
  }

  blockByUserId(userId: string) {
    return this.buildUrl('/api/users/blocks/:userId', { pathParams: { userId } });
  }
}
