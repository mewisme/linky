import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { logger } from "../../utils/logger.js";
import type { TablesUpdate } from "../../types/database.types.js";
import {
  getUserDetailsWithTags,
  getUserDetailsByUserId,
  createUserDetails,
  updateUserDetails,
  patchUserDetails,
} from "../../lib/supabase/queries/user-details.js";
import { getUserIdByClerkId } from "../../lib/supabase/queries/call-history.js";
import { getInterestTagsByIds } from "../../lib/supabase/queries/interest-tags.js";

const router: ExpressRouter = Router();

type UserDetailsUpdate = TablesUpdate<"user_details">;

/**
 * Validate interest_tags IDs exist and are active
 */
async function validateInterestTags(interestTags: string[] | null | undefined): Promise<void> {
  if (!interestTags || interestTags.length === 0) {
    return;
  }

  const validTags = await getInterestTagsByIds(interestTags);

  if (validTags.length !== interestTags.length) {
    const validIds = new Set(validTags.map((tag) => tag.id));
    const invalidIds = interestTags.filter((id) => !validIds.has(id));
    throw new Error(`Invalid interest tag IDs: ${invalidIds.join(", ")}`);
  }
}

/**
 * Validate date_of_birth is not in the future
 */
function validateDateOfBirth(dateOfBirth: string | null | undefined): void {
  if (!dateOfBirth) {
    return;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  if (birthDate > today) {
    throw new Error("Date of birth cannot be in the future");
  }
}

/**
 * GET /api/v1/user-details/me
 * Get current user's details with expanded interest tags
 */
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

    const userDetails = await getUserDetailsWithTags(userId);

    if (!userDetails) {
      return res.status(404).json({
        error: "Not Found",
        message: "User details not found",
      });
    }

    logger.info("User details fetched for user:", userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error("Unexpected error in GET /user-details/me:", error instanceof Error ? error.message : "Unknown error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch user details",
    });
  }
});

/**
 * PUT /api/v1/user-details/me
 * Full update current user's details
 */
router.put("/me", async (req: Request, res: Response) => {
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

    const userData: UserDetailsUpdate = req.body;

    // Remove user_id from update data (should not be changed)
    const { user_id, ...updateData } = userData;

    // Validate interest_tags
    if (updateData.interest_tags !== undefined) {
      await validateInterestTags(updateData.interest_tags);
    }

    // Validate date_of_birth
    if (updateData.date_of_birth !== undefined) {
      validateDateOfBirth(updateData.date_of_birth);
    }

    // Check if user details exists, create if not
    const existing = await getUserDetailsByUserId(userId);
    let result;

    if (!existing) {
      // Create new user details
      result = await createUserDetails(userId, updateData);
    } else {
      // Update existing user details
      result = await updateUserDetails(userId, updateData);
    }

    // Fetch with expanded tags
    const userDetails = await getUserDetailsWithTags(userId);

    logger.info("User details updated for user:", userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error("Unexpected error in PUT /user-details/me:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error && error.message.includes("Invalid interest tag")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes("Date of birth")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user details",
    });
  }
});

/**
 * PATCH /api/v1/user-details/me
 * Partial update current user's details
 */
router.patch("/me", async (req: Request, res: Response) => {
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

    const userData: Partial<UserDetailsUpdate> = req.body;

    // Remove user_id from update data (should not be changed)
    const { user_id, ...updateData } = userData;

    // Validate interest_tags if provided
    if (updateData.interest_tags !== undefined) {
      await validateInterestTags(updateData.interest_tags);
    }

    // Validate date_of_birth if provided
    if (updateData.date_of_birth !== undefined) {
      validateDateOfBirth(updateData.date_of_birth);
    }

    // Check if user details exists, create if not
    const existing = await getUserDetailsByUserId(userId);
    let result;

    if (!existing) {
      // Create new user details
      result = await createUserDetails(userId, updateData);
    } else {
      // Update existing user details
      result = await patchUserDetails(userId, updateData);
    }

    // Fetch with expanded tags
    const userDetails = await getUserDetailsWithTags(userId);

    logger.info("User details patched for user:", userId);

    return res.json(userDetails);
  } catch (error) {
    logger.error("Unexpected error in PATCH /user-details/me:", error instanceof Error ? error.message : "Unknown error");

    if (error instanceof Error && error.message.includes("Invalid interest tag")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes("Date of birth")) {
      return res.status(400).json({
        error: "Bad Request",
        message: error.message,
      });
    }

    if (error instanceof Error && error.message === "User details not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update user details",
    });
  }
});

export default router;
