import type { VapidPublicKeyResponse } from "@/types/notifications.types";
import { client } from "@/lib/client";

export async function subscribeToPush(
  subscription: PushSubscriptionJSON,
  token: string
): Promise<void> {
  return client.post<void>(
    "/api/push/subscribe",
    {
      subscription: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

export async function unsubscribeFromPush(
  endpoint: string,
  token: string
): Promise<void> {
  return client.delete<void>("/api/push/unsubscribe", {
    headers: { Authorization: `Bearer ${token}` },
    body: { endpoint },
  });
}

export async function getVapidPublicKey(token?: string): Promise<VapidPublicKeyResponse> {
  const opts = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  return client.get<VapidPublicKeyResponse>("/api/push/vapid-public-key", opts);
}
