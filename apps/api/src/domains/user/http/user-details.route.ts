import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@ws/logger";
import type { InterestTagsBody, UserDetailsUpdate } from "@/domains/user/types/user-details.types.js";
import {
  addUserInterestTags,
  clearUserInterestTags,
  fetchUserDetailsWithTags,
  getUserIdByClerkUserId,
  patchUserDetailsForUser,
  putUserDetails,
  removeUserInterestTags,
  replaceUserInterestTags,
} from "@/domains/user/service/user-details.service.js";
import { getCachedData, invalidateCacheKey } from "@/infra/redis/cache-utils.js";
import { CACHE_KEYS, CACHE_TTL } from "@/infra/redis/cache-config.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:user:details:route");

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const userDetails = await getCachedData(
      CACHE_KEYS.userDetails(userId),
      async () => {
        const userDetails = await fetchUserDetailsWithTags(userId);
        if (!userDetails) {
          throw new Error("User details not found");
        }
        return userDetails;
      },
      CACHE_TTL.USER_DETAILS
    );

    return res.json(userDetails);
  } catch (error) {
    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: "User details not found",
      });
    }

    logger.error("Unexpected error in GET /user-details/me: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user details",
    });
  }
});

router.put("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const userData: UserDetailsUpdate = req.body;

    const { user_id, ...updateData } = userData;

    const result = await putUserDetails(userId, updateData);

    // Invalidate cache after successful database update
    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error("Unexpected error in PUT /user-details/me: %o", error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && error.message.includes("Invalid interest tag")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof Error && error.message.includes("Date of birth")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user details",
    });
  }
});

router.patch("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const userData: Partial<UserDetailsUpdate> = req.body;

    const { user_id, ...updateData } = userData;

    const result = await patchUserDetailsForUser(userId, updateData);

    // Invalidate cache after successful database update
    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error("Unexpected error in PATCH /user-details/me: %o", error instanceof Error ? error : new Error(String(error)));

    if (error instanceof Error && error.message.includes("Invalid interest tag")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof Error && error.message.includes("Date of birth")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user details",
    });
  }
});

router.post("/me/interest-tags", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const { tagIds } = req.body as InterestTagsBody;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "tagIds must be a non-empty array",
      });
    }

    const result = await addUserInterestTags(userId, tagIds);

    // Invalidate cache after successful database update
    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(
      "Unexpected error in POST /user-details/me/interest-tags: %o",
      error instanceof Error ? error : new Error(String(error)),
    );

    if (error instanceof Error && error.message.includes("Invalid or inactive")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to add interest tags",
    });
  }
});

router.delete("/me/interest-tags", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const { tagIds } = req.body as InterestTagsBody;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "tagIds must be a non-empty array",
      });
    }

    const result = await removeUserInterestTags(userId, tagIds);

    // Invalidate cache after successful database update
    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(
      "Unexpected error in DELETE /user-details/me/interest-tags: %o",
      error instanceof Error ? error : new Error(String(error)),
    );

    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to remove interest tags",
    });
  }
});

router.put("/me/interest-tags", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const { tagIds } = req.body as InterestTagsBody;

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "tagIds must be an array",
      });
    }

    const result = await replaceUserInterestTags(userId, tagIds);

    // Invalidate cache after successful database update
    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(
      "Unexpected error in PUT /user-details/me/interest-tags: %o",
      error instanceof Error ? error : new Error(String(error)),
    );

    if (error instanceof Error && error.message.includes("Invalid or inactive")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to replace interest tags",
    });
  }
});

router.delete("/me/interest-tags/all", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const result = await clearUserInterestTags(userId);

    // Invalidate cache after successful database update
    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(
      "Unexpected error in DELETE /user-details/me/interest-tags/all: %o",
      error instanceof Error ? error : new Error(String(error)),
    );

    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to clear interest tags",
    });
  }
});

export default router;

