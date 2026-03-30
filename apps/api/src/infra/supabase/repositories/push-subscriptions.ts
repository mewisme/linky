import type { TablesInsert } from "@/types/database/supabase.types.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { supabase } from "@/infra/supabase/client.js";

type PushSubscriptionInsert = TablesInsert<"push_subscriptions">;

const logger = createLogger("infra:supabase:repositories:push-subscriptions");

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface CreateSubscriptionParams {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function createSubscription(params: CreateSubscriptionParams): Promise<PushSubscriptionRecord> {
  const { userId, endpoint, p256dh, auth } = params;

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
      } as PushSubscriptionInsert,
      {
        onConflict: "endpoint",
      }
    )
    .select()
    .single();

  if (error) {
    logger.error(toLoggableError(error), "Error creating push subscription");
    throw error;
  }

  return data as PushSubscriptionRecord;
}

export async function deleteSubscription(userId: string, endpoint: string): Promise<boolean> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);

  if (error) {
    logger.error(toLoggableError(error), "Error deleting push subscription");
    throw error;
  }

  return true;
}

export async function getUserSubscriptions(userId: string): Promise<PushSubscriptionRecord[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    logger.error(toLoggableError(error), "Error fetching user subscriptions");
    throw error;
  }

  return (data || []) as PushSubscriptionRecord[];
}

export async function deleteExpiredSubscription(endpoint: string): Promise<boolean> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    logger.error(toLoggableError(error), "Error deleting expired subscription");
    throw error;
  }

  return true;
}
