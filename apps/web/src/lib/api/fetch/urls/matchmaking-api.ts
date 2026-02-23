import { BaseApiUrl } from './base-api-url';

export class MatchmakingApi extends BaseApiUrl {
  queueStatus() {
    return this.buildUrl('/api/matchmaking/queue-status');
  }
}
