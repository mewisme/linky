import { redisClient } from "@/infra/redis/client.js";
import { withRedisTimeout } from "@/infra/redis/timeout-wrapper.js";
import { createLogger } from "@/utils/logger.js";
import type { ClerkWebhookEvent } from "@/types/webhook/webhook.types.js";
import { handleClerkWebhookEvent } from "@/webhook/clerk-webhook-handler.js";

const logger = createLogger("context:clerk-webhook");

const PROCESSING_TTL_SECONDS = 10 * 60;
const PROCESSED_TTL_SECONDS = 24 * 60 * 60;
const PROCESSING_PREFIX = "webhook:clerk:processing:";
const PROCESSED_PREFIX = "webhook:clerk:processed:";

function processingKey(deliveryId: string): string {
  return `${PROCESSING_PREFIX}${deliveryId}`;
}

function processedKey(deliveryId: string): string {
  return `${PROCESSED_PREFIX}${deliveryId}`;
}

async function isProcessed(deliveryId: string): Promise<boolean> {
  if (!redisClient.isOpen) return false;
  const key = processedKey(deliveryId);
  const value = await withRedisTimeout(() => redisClient.get(key), "clerk-webhook-processed-get");
  return value === "1";
}

async function acquireProcessingLock(deliveryId: string): Promise<boolean> {
  if (!redisClient.isOpen) return true;
  const key = processingKey(deliveryId);
  const result = await withRedisTimeout(
    () => redisClient.set(key, "1", { NX: true, EX: PROCESSING_TTL_SECONDS }),
    "clerk-webhook-processing-lock",
  );
  return result === "OK";
}

async function markProcessed(deliveryId: string): Promise<void> {
  if (!redisClient.isOpen) return;
  await withRedisTimeout(async () => {
    await redisClient.set(processedKey(deliveryId), "1", { EX: PROCESSED_TTL_SECONDS });
    await redisClient.del(processingKey(deliveryId));
  }, "clerk-webhook-mark-processed");
}

async function releaseProcessingLock(deliveryId: string): Promise<void> {
  if (!redisClient.isOpen) return;
  await withRedisTimeout(() => redisClient.del(processingKey(deliveryId)), "clerk-webhook-processing-unlock");
}

export async function processClerkWebhookDelivery(deliveryId: string, evt: ClerkWebhookEvent): Promise<void> {
  try {
    if (await isProcessed(deliveryId)) {
      return;
    }

    const lockAcquired = await acquireProcessingLock(deliveryId);
    if (!lockAcquired) {
      return;
    }

    await handleClerkWebhookEvent(evt);
    await markProcessed(deliveryId);
  } catch (error) {
    await releaseProcessingLock(deliveryId).catch(() => {
      logger.warn("Failed to release processing lock for delivery %s", deliveryId);
    });
    throw error;
  }
}
