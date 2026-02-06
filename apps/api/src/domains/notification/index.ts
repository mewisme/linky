export { default as notificationsRouter } from "./http/notifications.route.js";
export { default as pushRouter } from "./http/push.route.js";

export {
  createNotification,
  markRead,
  markAllRead,
  getUserNotifications,
  getUnreadCount,
  setNotificationContext,
  getNotificationContext,
} from "./service/notification.service.js";

export {
  subscribe,
  unsubscribe,
  sendPushToUser,
  sendPushOnly,
  handlePushError,
} from "./service/push.service.js";

export type {
  NotificationRecord,
  NotificationType,
  NotificationPayload,
  FavoriteAddedPayload,
  LevelUpPayload,
  StreakMilestonePayload,
  StreakExpiringPayload,
  AdminBroadcastPayload,
} from "./types/notification.types.js";

export type {
  PushSubscriptionRecord,
  WebPushSubscription,
  PushOnlyOptions,
  SubscribeBody,
  UnsubscribeBody,
} from "./types/push.types.js";
