export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscribeBody {
  subscription: WebPushSubscription;
}

export interface UnsubscribeBody {
  endpoint: string;
}

export interface PushOnlyOptions {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}
