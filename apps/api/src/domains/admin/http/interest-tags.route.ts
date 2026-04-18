import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um, umDetail } from "@/lib/api-user-message.js";
import { sendJsonError, sendJsonWithUserMessage } from "@/lib/http-json-response.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import type { AdminInterestTagInsert, AdminInterestTagUpdate } from "@/domains/admin/types/admin.types.js";
import {
  createAdminInterestTag,
  getInterestTag,
  hardDeleteInterestTag,
  importInterestTags,
  listInterestTags,
  softDeleteInterestTag,
  updateAdminInterestTag,
} from "@/domains/admin/service/admin-interest-tags.service.js";
import type { InterestTagsImportRequestBody } from "@/domains/admin/types/admin.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:interest-tags:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    let isActive: boolean | undefined;
    if (req.query.isActive !== undefined) {
      const isActiveParam = req.query.isActive as string;
      if (isActiveParam === "all") {
        isActive = undefined;
      } else {
        isActive = isActiveParam === "true" || isActiveParam === "1";
      }
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, count } = await listInterestTags({
      category,
      isActive,
      search,
      limit,
      offset,
    });

    return res.json({
      data,
      pagination: {
        limit,
        offset,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/interest-tags");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_INTEREST_TAGS", "failedFetchInterestTags", "Failed to fetch interest tags"),
    );
  }
});

router.post("/import", async (req: Request, res: Response) => {
  try {
    const body = req.body as unknown;

    if (!body || typeof body !== "object" || !Array.isArray((body as InterestTagsImportRequestBody).items)) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        umDetail(
          "INTEREST_TAGS_IMPORT_BODY",
          "Request body must be an object with an 'items' array",
        ),
      );
    }

    const result = await importInterestTags(body as InterestTagsImportRequestBody);

    return res.json(result);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/interest-tags/import");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("FAILED_IMPORT_INTEREST_TAGS", "Failed to import interest tags"),
    );
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_TAG_ID", "invalidTagId", "Invalid tag ID"));
    }

    const tag = await getInterestTag(id);

    if (!tag) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        umDetail("INTEREST_TAG_NOT_FOUND", "Interest tag not found"),
      );
    }

    return res.json(tag);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/interest-tags/:id");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_INTEREST_TAG", "failedFetchInterestTag", "Failed to fetch interest tag"),
    );
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const tagData: AdminInterestTagInsert = req.body;

    if (!tagData.name || typeof tagData.name !== "string" || tagData.name.trim().length === 0) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        umDetail("INTEREST_TAG_NAME_REQUIRED", "Tag name is required and must be a non-empty string"),
      );
    }

    if (tagData.name.length > 100) {
      return sendJsonError(
        res,
        400,
        "Bad Request",
        umDetail("INTEREST_TAG_NAME_LENGTH", "Tag name must be 100 characters or less"),
      );
    }

    const created = await createAdminInterestTag(tagData);

    return res.status(201).json(created);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/interest-tags");

    if (error instanceof Error && error.message.includes("duplicate") || (error instanceof Error && error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        umDetail("INTEREST_TAG_DUPLICATE_NAME", "An interest tag with this name already exists"),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("FAILED_CREATE_INTEREST_TAG", "Failed to create interest tag"),
    );
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_TAG_ID", "invalidTagId", "Invalid tag ID"));
    }

    const tagData: AdminInterestTagUpdate = req.body;

    if (tagData.name !== undefined) {
      if (typeof tagData.name !== "string" || tagData.name.trim().length === 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("INTEREST_TAG_NAME_NONEMPTY", "Tag name must be a non-empty string"),
        );
      }

      if (tagData.name.length > 100) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("INTEREST_TAG_NAME_LENGTH", "Tag name must be 100 characters or less"),
        );
      }
    }

    const updated = await updateAdminInterestTag(id, tagData);

    return res.json(updated);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PUT /admin/interest-tags/:id");

    if (error instanceof Error && error.message === "Interest tag not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("INTEREST_TAG_NOT_FOUND", error.message));
    }

    if (error instanceof Error && error.message.includes("duplicate") || (error instanceof Error && error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        umDetail("INTEREST_TAG_DUPLICATE_NAME", "An interest tag with this name already exists"),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("FAILED_UPDATE_INTEREST_TAG", "Failed to update interest tag"),
    );
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_TAG_ID", "invalidTagId", "Invalid tag ID"));
    }

    const tagData: Partial<AdminInterestTagUpdate> = req.body;

    if (tagData.name !== undefined) {
      if (typeof tagData.name !== "string" || tagData.name.trim().length === 0) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("INTEREST_TAG_NAME_NONEMPTY", "Tag name must be a non-empty string"),
        );
      }

      if (tagData.name.length > 100) {
        return sendJsonError(
          res,
          400,
          "Bad Request",
          umDetail("INTEREST_TAG_NAME_LENGTH", "Tag name must be 100 characters or less"),
        );
      }
    }

    const updated = await updateAdminInterestTag(id, tagData);

    return res.json(updated);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in PATCH /admin/interest-tags/:id");

    if (error instanceof Error && error.message === "Interest tag not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("INTEREST_TAG_NOT_FOUND", error.message));
    }

    if (error instanceof Error && error.message.includes("duplicate") || (error instanceof Error && error.message.includes("unique"))) {
      return sendJsonError(
        res,
        409,
        "Conflict",
        umDetail("INTEREST_TAG_DUPLICATE_NAME", "An interest tag with this name already exists"),
      );
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("FAILED_UPDATE_INTEREST_TAG", "Failed to update interest tag"),
    );
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_TAG_ID", "invalidTagId", "Invalid tag ID"));
    }

    const deleted = await softDeleteInterestTag(id);

    return sendJsonWithUserMessage(
      res,
      200,
      { data: deleted },
      umDetail("INTEREST_TAG_DEACTIVATED", "Interest tag deactivated successfully"),
    );
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /admin/interest-tags/:id");

    if (error instanceof Error && error.message === "Interest tag not found") {
      return sendJsonError(res, 404, "Not Found", umDetail("INTEREST_TAG_NOT_FOUND", error.message));
    }

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("FAILED_DELETE_INTEREST_TAG", "Failed to delete interest tag"),
    );
  }
});

router.delete("/:id/hard", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return sendJsonError(res, 400, "Bad Request", um("INVALID_TAG_ID", "invalidTagId", "Invalid tag ID"));
    }

    await hardDeleteInterestTag(id);

    return sendJsonWithUserMessage(
      res,
      200,
      {},
      umDetail("INTEREST_TAG_HARD_DELETED", "Interest tag permanently deleted"),
    );
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /admin/interest-tags/:id/hard");

    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      umDetail("FAILED_HARD_DELETE_INTEREST_TAG", "Failed to hard delete interest tag"),
    );
  }
});

export default router;

