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
