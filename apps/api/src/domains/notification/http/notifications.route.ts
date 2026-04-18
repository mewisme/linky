import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import {
  getUserNotifications,
  markRead,
  markAllRead,
  getUnreadCount,
} from "@/domains/notification/service/notification.service.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:notification:route");

router.get("/me", async (req: Request, res: Response) => {
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

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread_only === "true";

    const notifications = await getUserNotifications(userId, { limit, offset, unreadOnly });

    return res.json({ notifications });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /notifications/me");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_NOTIFICATIONS", "failedFetchNotifications", "Failed to fetch notifications"),
    );
  }
});

router.get("/me/unread-count", async (req: Request, res: Response) => {
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

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const count = await getUnreadCount(userId);

    return res.json({ count });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /notifications/me/unread-count");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_UNREAD", "failedFetchUnreadCount", "Failed to fetch unread count"),
    );
  }
});

router.patch("/:id/read", async (req: Request, res: Response) => {
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

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const notificationId = req.params.id;

    if (!notificationId || typeof notificationId !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("NOTIFICATION_ID_REQUIRED", "notificationIdRequired", "Notification ID is required"),
      );
    }

    await markRead(notificationId, userId);

    return res.status(204).send();
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /notifications/:id/read");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_MARK_READ", "failedMarkNotificationRead", "Failed to mark notification as read"),
    );
  }
});

router.patch("/read-all", async (req: Request, res: Response) => {
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

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    await markAllRead(userId);

    return res.status(204).send();
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /notifications/read-all");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_MARK_ALL_READ", "failedMarkAllRead", "Failed to mark all notifications as read"),
    );
  }
});

export default router;
