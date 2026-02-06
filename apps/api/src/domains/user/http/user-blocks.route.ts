import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import { blockUser, unblockUser, getBlockedUsersWithDetails } from "@/domains/user/service/user-block.service.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import type { BlockUserBody } from "@/domains/user/types/user-block.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:blocks:route");

router.post("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const { blocked_user_id } = req.body as BlockUserBody;

    if (!blocked_user_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "blocked_user_id is required",
      });
    }

    const blockerId = await getUserIdByClerkId(clerkUserId);
    if (!blockerId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const block = await blockUser(blockerId, blocked_user_id);

    return res.status(201).json(block);
  } catch (error) {
    if (error instanceof Error && (error.message === "Cannot block yourself" || error.message === "User is already blocked")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    logger.error("Unexpected error in POST /users/blocks: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to block user",
    });
  }
});

router.delete("/:blocked_user_id", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const blockedUserId = req.params.blocked_user_id;

    if (!blockedUserId || typeof blockedUserId !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "blocked_user_id is required",
      });
    }

    const blockerId = await getUserIdByClerkId(clerkUserId);
    if (!blockerId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    await unblockUser(blockerId, blockedUserId);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "User is not blocked") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    logger.error("Unexpected error in DELETE /users/blocks/:id: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to unblock user",
    });
  }
});

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

    const blockedUsers = await getBlockedUsersWithDetails(userId);

    return res.json({ blocked_users: blockedUsers });
  } catch (error) {
    logger.error("Unexpected error in GET /users/blocks/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch blocked users",
    });
  }
});

export default router;
