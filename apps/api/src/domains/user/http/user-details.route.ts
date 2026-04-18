import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
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

const umAuth = () =>
  um("USER_ID_NOT_IN_TOKEN", "userIdNotInToken", "User ID not found in authentication token");
const umNoUser = () => um("USER_NOT_IN_DB", "userNotInDatabase", "User not found in database");

router.get("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(res, 401, "Unauthorized", umAuth());
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(res, 404, "Not Found", umNoUser());
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
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("USER_DETAILS_NOT_FOUND", "userDetailsNotFound", "User details not found"),
      );
    }

    logger.error(toLoggableError(error), "Unexpected error in GET /user-details/me");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_DETAILS", "failedFetchUserDetails", "Failed to fetch user details"),
    );
  }
});

router.put("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(res, 401, "Unauthorized", umAuth());
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(res, 404, "Not Found", umNoUser());
    }

    const userData: UserDetailsUpdate = req.body;

    const { user_id, ...updateData } = userData;

    const result = await putUserDetails(userId, updateData);

    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PUT /user-details/me");

    if (error instanceof Error && error.message.includes("Invalid interest tag")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("PUT_DETAILS_VALIDATION", error.message));
    }

    if (error instanceof Error && error.message.includes("Date of birth")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("PUT_DETAILS_DOB", error.message));
    }

    if (error instanceof Error && error.message.includes("Bio must be")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("PUT_DETAILS_BIO", error.message));
    }

    if (error instanceof Error && error.message === "User details not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("PUT_DETAILS_NOT_FOUND", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_DETAILS_PUT", "failedUpdateUserDetails", "Failed to update user details"),
    );
  }
});

router.patch("/me", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(res, 401, "Unauthorized", umAuth());
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(res, 404, "Not Found", umNoUser());
    }

    const userData: Partial<UserDetailsUpdate> = req.body;

    const { user_id, ...updateData } = userData;

    const result = await patchUserDetailsForUser(userId, updateData);

    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /user-details/me");

    if (error instanceof Error && error.message.includes("Invalid interest tag")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("PATCH_DETAILS_TAG", error.message));
    }

    if (error instanceof Error && error.message.includes("Date of birth")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("PATCH_DETAILS_DOB", error.message));
    }

    if (error instanceof Error && error.message.includes("Bio must be")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("PATCH_DETAILS_BIO", error.message));
    }

    if (error instanceof Error && error.message === "User details not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("PATCH_DETAILS_NOT_FOUND", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UPDATE_DETAILS_PATCH", "failedUpdateUserDetails", "Failed to update user details"),
    );
  }
});

router.post("/me/interest-tags", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(res, 401, "Unauthorized", umAuth());
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(res, 404, "Not Found", umNoUser());
    }

    const { tagIds } = req.body as InterestTagsBody;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("TAG_IDS_NON_EMPTY", "tagIdsNonEmpty", "tagIds must be a non-empty array"),
      );
    }

    const result = await addUserInterestTags(userId, tagIds);

    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /user-details/me/interest-tags");

    if (error instanceof Error && error.message.includes("Invalid or inactive")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("ADD_TAGS_INVALID", error.message));
    }

    if (error instanceof Error && error.message === "User details not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("ADD_TAGS_NOT_FOUND", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_ADD_TAGS", "failedAddInterestTags", "Failed to add interest tags"),
    );
  }
});

router.delete("/me/interest-tags", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(res, 401, "Unauthorized", umAuth());
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(res, 404, "Not Found", umNoUser());
    }

    const { tagIds } = req.body as InterestTagsBody;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        um("TAG_IDS_NON_EMPTY_DEL", "tagIdsNonEmpty", "tagIds must be a non-empty array"),
      );
    }

    const result = await removeUserInterestTags(userId, tagIds);

    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /user-details/me/interest-tags");

    if (error instanceof Error && error.message === "User details not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("REMOVE_TAGS_NOT_FOUND", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_REMOVE_TAGS", "failedRemoveInterestTags", "Failed to remove interest tags"),
    );
  }
});

router.put("/me/interest-tags", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(res, 401, "Unauthorized", umAuth());
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(res, 404, "Not Found", umNoUser());
    }

    const { tagIds } = req.body as InterestTagsBody;

    if (!Array.isArray(tagIds)) {
      return sendJsonError(res, 400, "Bad Request", um("TAG_IDS_ARRAY", "tagIdsArray", "tagIds must be an array"));
    }

    const result = await replaceUserInterestTags(userId, tagIds);

    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PUT /user-details/me/interest-tags");

    if (error instanceof Error && error.message.includes("Invalid or inactive")) {
      return sendJsonError(res, 400, "Bad Request", umDetail("REPLACE_TAGS_INVALID", error.message));
    }

    if (error instanceof Error && error.message === "User details not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("REPLACE_TAGS_NOT_FOUND", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_REPLACE_TAGS", "failedReplaceInterestTags", "Failed to replace interest tags"),
    );
  }
});

router.delete("/me/interest-tags/all", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;

    if (!clerkUserId) {
      return sendJsonError(res, 401, "Unauthorized", umAuth());
    }

    const userId = await getUserIdByClerkUserId(clerkUserId);
    if (!userId) {
      return sendJsonError(res, 404, "Not Found", umNoUser());
    }

    const result = await clearUserInterestTags(userId);

    await invalidateCacheKey(CACHE_KEYS.userDetails(userId));

    const userDetails = await fetchUserDetailsWithTags(userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /user-details/me/interest-tags/all");

    if (error instanceof Error && error.message === "User details not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("CLEAR_TAGS_NOT_FOUND", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_CLEAR_TAGS", "failedClearInterestTags", "Failed to clear interest tags"),
    );
  }
});

export default router;
