import type { VapidPublicKeyResponse } from "@/types/notifications.types";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { deleteData, fetchData, postData } from "@/lib/api/fetch/client-api";

export async function subscribeToPush(
  subscription: PushSubscriptionJSON,
  token: string
): Promise<void> {
  return postData<void>(apiUrl.push.subscribe(), {
    token,
    body: {
      subscription: {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
    },
  });
}

export async function unsubscribeFromPush(
  endpoint: string,
  token: string
): Promise<void> {
  return deleteData<void>(apiUrl.push.unsubscribe(), {
    token,
    body: { endpoint },
  });
}

export async function getVapidPublicKey(token?: string): Promise<VapidPublicKeyResponse> {
  return fetchData<VapidPublicKeyResponse>(
    apiUrl.push.vapidPublicKey(),
    token ? { token } : {}
  );
}
