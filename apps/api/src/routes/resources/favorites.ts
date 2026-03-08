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
import { createLogger } from "@/utils/logger.js";
import { getCachedData, invalidateCacheKey } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";
import { rateLimitMiddleware } from "@/middleware/rate-limit.js";

const router: ExpressRouter = Router();
const logger = createLogger("routes:resources:favorites");

router.get("/", async (req: Request, res: Response) => {
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
    logger.error(
      "Unexpected error in GET /favorites: %o",
      error as Error
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch favorites",
    });
  }
});

router.post("/", rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { favorite_user_id } = req.body;

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

    if (!favorite_user_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "favorite_user_id is required",
      });
    }

    if (userId === favorite_user_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cannot favorite yourself",
      });
    }

    const limitCheck = await checkDailyLimitReached(userId);
    if (limitCheck.reached) {
      return res.status(429).json({
        error: "Too Many Requests",
        message: "Daily favorite limit reached",
        current: limitCheck.current,
        limit: limitCheck.limit,
      });
    }

    const exists = await checkFavoriteExists(userId, favorite_user_id);
    if (exists) {
      return res.status(409).json({
        error: "Conflict",
        message: "User is already in favorites",
      });
    }

    const favorite = await createFavorite(userId, favorite_user_id);
    await incrementFavoriteLimit(userId);

    await invalidateCacheKey(CACHE_KEYS.userFavorites(userId));

    return res.status(201).json({
      data: favorite,
      message: "User added to favorites",
    });
  } catch (error: unknown) {
    logger.error(
      "Unexpected error in POST /favorites: %o",
      error as Error
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to add favorite",
    });
  }
});

router.delete("/:favorite_user_id", rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    const { favorite_user_id } = req.params as { favorite_user_id: string };

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

    if (!favorite_user_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "favorite_user_id is required",
      });
    }

    const exists = await checkFavoriteExists(userId, favorite_user_id);
    if (!exists) {
      return res.status(404).json({
        error: "Not Found",
        message: "Favorite not found",
      });
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
        logger.error(error as Error, "Failed to refund daily limit");
      }
    }

    await invalidateCacheKey(CACHE_KEYS.userFavorites(userId));

    return res.json({
      message: "Favorite removed successfully",
      refunded: isSameDay,
    });
  } catch (error: unknown) {
    logger.error(
      "Unexpected error in DELETE /favorites/:favorite_user_id: %o",
      error as Error
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to remove favorite",
    });
  }
});

export default router;
