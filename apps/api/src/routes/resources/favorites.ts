import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import {
  checkFavoriteExists,
  createFavorite,
  deleteFavorite,
  checkDailyLimitReached,
  incrementFavoriteLimit,
  getFavoriteCreationDate,
  decrementFavoriteLimit,
  getFavoritesWithStats,
} from "@/infra/supabase/repositories/favorites.js";
import { getUserIdByClerkId } from "@/infra/supabase/repositories/call-history.js";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { getCachedData, invalidateCacheKey } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";
import { rateLimitMiddleware } from "@/middleware/rate-limit.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:resources:favorites");

router.get("/", async (req: Request, res: Response) => {
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

    const favorites = await getCachedData(
      CACHE_KEYS.userFavorites(userId),
      () => getFavoritesWithStats(userId),
      CACHE_TTL.USER_FAVORITES
    );

    return res.json({
      data: favorites,
      count: favorites.length,
    });
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in GET /favorites");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_FAVORITES", "failedFetchFavorites", "Failed to fetch favorites"),
    );
  }
});

router.post("/", rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { favorite_user_id } = req.body;

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

    if (!favorite_user_id) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required"),
      );
    }

    if (userId === favorite_user_id) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("CANNOT_FAVORITE_SELF", "cannotFavoriteYourself", "Cannot favorite yourself"),
      );
    }

    const limitCheck = await checkDailyLimitReached(userId);
    if (limitCheck.reached) {
      return sendJsonError(
        res,
        429,
        "Too Many Requests",
        um("DAILY_FAVORITE_LIMIT", "dailyFavoriteLimitReached", "Daily favorite limit reached"),
        { current: limitCheck.current, limit: limitCheck.limit },
      );
    }

    const exists = await checkFavoriteExists(userId, favorite_user_id);
    if (exists) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        um("ALREADY_IN_FAVORITES", "alreadyInFavorites", "User is already in favorites"),
      );
    }

    const favorite = await createFavorite(userId, favorite_user_id);
    await incrementFavoriteLimit(userId);

    await invalidateCacheKey(CACHE_KEYS.userFavorites(userId));

    return sendJsonWithUserMessage(
      res,
      201,
      { data: favorite },
      um("USER_ADDED_FAVORITES", "userAddedToFavorites", "User added to favorites"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in POST /favorites");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_ADD_FAVORITE", "failedAddFavorite", "Failed to add favorite"),
    );
  }
});

router.delete("/:favorite_user_id", rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { favorite_user_id } = req.params as { favorite_user_id: string };

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

    if (!favorite_user_id) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("FAVORITE_USER_ID_REQUIRED", "favoriteUserIdRequired", "favorite_user_id is required"),
      );
    }

    const exists = await checkFavoriteExists(userId, favorite_user_id);
    if (!exists) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("FAVORITE_NOT_FOUND", "favoriteNotFound", "Favorite not found"),
      );
    }

    const createdAt = await getFavoriteCreationDate(userId, favorite_user_id);
    const today = new Date().toISOString().split("T")[0];
    const createdDate = createdAt ? createdAt.split("T")[0] : null;
    const isSameDay = createdDate === today;

    await deleteFavorite(userId, favorite_user_id);

    if (isSameDay) {
      try {
        await decrementFavoriteLimit(userId);
      } catch (error: unknown) {
        logger.error(toLoggableError(error), "Failed to refund daily limit");
      }
    }

    await invalidateCacheKey(CACHE_KEYS.userFavorites(userId));

    return sendJsonWithUserMessage(
      res,
      200,
      { refunded: isSameDay },
      um("FAVORITE_REMOVED", "favoriteRemovedSuccess", "Favorite removed successfully"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /favorites/:favorite_user_id");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_REMOVE_FAVORITE", "failedRemoveFavorite", "Failed to remove favorite"),
    );
  }
});

export default router;
