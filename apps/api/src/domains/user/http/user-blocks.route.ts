import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { blockUser, unblockUser, getBlockedUsersWithDetails } from "@/domains/user/service/user-block.service.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import type { BlockUserBody } from "@/domains/user/types/user-block.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:blocks:route");

router.post("/", async (req: Request, res: Response) => {
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

    const { blocked_user_id } = req.body as BlockUserBody;

    if (!blocked_user_id) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("BLOCKED_USER_ID_REQUIRED", "blockedUserIdRequired", "blocked_user_id is required"),
      );
    }

    const blockerId = await getUserIdByClerkId(clerkUserId);
    if (!blockerId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    const block = await blockUser(blockerId, blocked_user_id);

    return res.status(201).json(block);
  } catch (error) {
    if (error instanceof Error && (error.message === "Cannot block yourself" || error.message === "User is already blocked")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("BLOCK_VALIDATION", error.message));
    }

    logger.error(toLoggableError(error), "Unexpected error in POST /users/blocks");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_BLOCK_USER", "failedBlockUser", "Failed to block user"),
    );
  }
});

router.delete("/:blocked_user_id", async (req: Request, res: Response) => {
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

    const blockedUserId = req.params.blocked_user_id;

    if (!blockedUserId || typeof blockedUserId !== "string") {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("BLOCKED_USER_ID_REQUIRED", "blockedUserIdRequired", "blocked_user_id is required"),
      );
    }

    const blockerId = await getUserIdByClerkId(clerkUserId);
    if (!blockerId) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database"),
      );
    }

    await unblockUser(blockerId, blockedUserId);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "User is not blocked") {
      return sendJsonError(res, 404, "Not Found", umDetail("NOT_BLOCKED", error.message));
    }

    logger.error(toLoggableError(error), "Unexpected error in DELETE /users/blocks/:id");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UNBLOCK_USER", "failedUnblockUser", "Failed to unblock user"),
    );
  }
});

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

    const blockedUsers = await getBlockedUsersWithDetails(userId);

    return res.json({ blocked_users: blockedUsers });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /users/blocks/me");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_BLOCKED", "failedFetchBlockedUsers", "Failed to fetch blocked users"),
    );
  }
});

export default router;
