import {
  MediaApi,
  NotificationsApi,
  PushApi,
  ResourcesApi,
  UserApi,
} from "./urls";

import { publicEnv } from "@/shared/env/public-env";

export class ApiUrl {
  private static readonly PROXY_URL = publicEnv.APP_URL;

  resources: ResourcesApi;
  users: UserApi;
  media: MediaApi;
  notifications: NotificationsApi;
  push: PushApi;

  constructor() {
    this.resources = new ResourcesApi(ApiUrl.PROXY_URL);
    this.users = new UserApi(ApiUrl.PROXY_URL);
    this.media = new MediaApi(ApiUrl.PROXY_URL);
    this.notifications = new NotificationsApi(ApiUrl.PROXY_URL);
    this.push = new PushApi(ApiUrl.PROXY_URL);
  }
}

export const apiUrl = new ApiUrl();
