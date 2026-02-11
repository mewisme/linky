import { BaseApiUrl } from './base-api-url';

export class AdminApi extends BaseApiUrl {
  broadcasts(params?: URLSearchParams) {
    return this.buildUrl('/api/admin/broadcasts', params);
  }

  changelogs(params?: URLSearchParams) {
    return this.buildUrl('/api/admin/changelogs', params);
  }

  changelogById(id: string) {
    return this.buildUrl('/api/admin/changelogs/:id', { pathParams: { id } });
  }

  interestTags(params?: URLSearchParams) {
    return this.buildUrl('/api/admin/interest-tags', params);
  }

  interestTagById(id: string) {
    return this.buildUrl('/api/admin/interest-tags/:id', { pathParams: { id } });
  }

  interestTagHardDelete(id: string) {
    return this.buildUrl('/api/admin/interest-tags/:id/hard', { pathParams: { id } });
  }

  interestTagsImport() {
    return this.buildUrl('/api/admin/interest-tags/import');
  }

  levelFeatureUnlocks(params?: URLSearchParams) {
    return this.buildUrl('/api/admin/level-feature-unlocks', params);
  }

  levelFeatureUnlockById(id: string) {
    return this.buildUrl('/api/admin/level-feature-unlocks/:id', { pathParams: { id } });
  }

  levelRewards(params?: URLSearchParams) {
    return this.buildUrl('/api/admin/level-rewards', params);
  }

  levelRewardById(id: string) {
    return this.buildUrl('/api/admin/level-rewards/:id', { pathParams: { id } });
  }

  streakExpBonuses(params?: URLSearchParams) {
    return this.buildUrl('/api/admin/streak-exp-bonuses', params);
  }

  streakExpBonusById(id: string) {
    return this.buildUrl('/api/admin/streak-exp-bonuses/:id', { pathParams: { id } });
  }

  reports(params?: URLSearchParams) {
    return this.buildUrl('/api/admin/reports', params);
  }

  reportById(id: string) {
    return this.buildUrl('/api/admin/reports/:id', { pathParams: { id } });
  }

  users(params?: URLSearchParams) {
    return this.buildUrl('/api/admin/users', params);
  }

  userById(id: string) {
    return this.buildUrl('/api/admin/users/:id', { pathParams: { id } });
  }

  embeddingsCompare() {
    return this.buildUrl('/api/admin/embeddings/compare');
  }

  embeddingsSimilar() {
    return this.buildUrl('/api/admin/embeddings/similar');
  }

  embeddingsSync() {
    return this.buildUrl('/api/admin/embeddings/sync');
  }

  mediaPresignedUpload() {
    return this.buildUrl('/api/admin/media/presigned-upload');
  }
}
