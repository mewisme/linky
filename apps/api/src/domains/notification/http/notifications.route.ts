import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
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
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const unreadOnly = req.query.unread_only === "true";

    const notifications = await getUserNotifications(userId, { limit, offset, unreadOnly });

    return res.json({ notifications });
  } catch (error) {
    logger.error("Unexpected error in GET /notifications/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch notifications",
    });
  }
});

router.get("/me/unread-count", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const count = await getUnreadCount(userId);

    return res.json({ count });
  } catch (error) {
    logger.error("Unexpected error in GET /notifications/me/unread-count: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch unread count",
    });
  }
});

router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const notificationId = req.params.id;

    if (!notificationId || typeof notificationId !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Notification ID is required",
      });
    }

    await markRead(notificationId, userId);

    return res.status(204).send();
  } catch (error) {
    logger.error("Unexpected error in PATCH /notifications/:id/read: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to mark notification as read",
    });
  }
});

router.patch("/read-all", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    await markAllRead(userId);

    return res.status(204).send();
  } catch (error) {
    logger.error("Unexpected error in PATCH /notifications/read-all: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to mark all notifications as read",
    });
  }
});

export default router;
