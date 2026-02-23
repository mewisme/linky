import {
  AdminApi,
  MatchmakingApi,
  MediaApi,
  NotificationsApi,
  PushApi,
  ResourcesApi,
  UserApi,
} from './urls';

import { publicEnv } from "@/env/public-env";

export class ApiUrl {
  private static readonly PROXY_URL = publicEnv.APP_URL;

  admin: AdminApi;
  resources: ResourcesApi;
  users: UserApi;
  media: MediaApi;
  notifications: NotificationsApi;
  push: PushApi;
  matchmaking: MatchmakingApi;

  constructor() {
    this.admin = new AdminApi(ApiUrl.PROXY_URL);
    this.resources = new ResourcesApi(ApiUrl.PROXY_URL);
    this.users = new UserApi(ApiUrl.PROXY_URL);
    this.media = new MediaApi(ApiUrl.PROXY_URL);
    this.notifications = new NotificationsApi(ApiUrl.PROXY_URL);
    this.push = new PushApi(ApiUrl.PROXY_URL);
    this.matchmaking = new MatchmakingApi(ApiUrl.PROXY_URL);
  }
}

export const apiUrl = new ApiUrl();
