import {
  AdminApi,
  MediaApi,
  NotificationsApi,
  PushApi,
  ResourcesApi,
  UserApi,
} from './urls';

export class ApiUrl {
  private static readonly PROXY_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  admin: AdminApi;
  resources: ResourcesApi;
  users: UserApi;
  media: MediaApi;
  notifications: NotificationsApi;
  push: PushApi;

  constructor() {
    this.admin = new AdminApi(ApiUrl.PROXY_URL);
    this.resources = new ResourcesApi(ApiUrl.PROXY_URL);
    this.users = new UserApi(ApiUrl.PROXY_URL);
    this.media = new MediaApi(ApiUrl.PROXY_URL);
    this.notifications = new NotificationsApi(ApiUrl.PROXY_URL);
    this.push = new PushApi(ApiUrl.PROXY_URL);
  }
}

export const apiUrl = new ApiUrl();
