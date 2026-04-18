import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { subscribe, unsubscribe } from "@/domains/notification/service/push.service.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { config } from "@/config/index.js";
import type { SubscribeBody, UnsubscribeBody } from "@/domains/notification/types/push.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:notification:push:route");

router.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
      );
    }

    const { subscription } = req.body as SubscribeBody;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("VALID_SUBSCRIPTION_REQUIRED", "validSubscriptionRequired", "Valid subscription object is required"),
      );
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const record = await subscribe(userId, subscription);

    return res.status(201).json(record);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /push/subscribe");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_SUBSCRIBE_PUSH", "failedSubscribePush", "Failed to subscribe to push notifications"),
    );
  }
});

router.delete("/unsubscribe", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(
        res,
        401,
        "Unauthorized",
        um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token"),
      );
    }

    const { endpoint } = req.body as UnsubscribeBody;

    if (!endpoint) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("ENDPOINT_REQUIRED", "endpointRequired", "endpoint is required"),
      );
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    await unsubscribe(userId, endpoint);

    return res.status(204).send();
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /push/unsubscribe");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UNSUBSCRIBE_PUSH", "failedUnsubscribePush", "Failed to unsubscribe from push notifications"),
    );
  }
});

router.get("/vapid-public-key", (_req: Request, res: Response) => {
  try {
    if (!config.vapidPublicKey) {
      return sendJsonError(
        res,
        503,
        "Service Unavailable",
        um("PUSH_NOT_CONFIGURED", "pushNotConfigured", "Push notifications are not configured"),
      );
    }

    return res.json({ publicKey: config.vapidPublicKey });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /push/vapid-public-key");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_VAPID", "failedFetchVapidKey", "Failed to fetch VAPID public key"),
    );
  }
});

export default router;
