import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import { getUserIdByClerkId } from "../../../infra/supabase/repositories/call-history.js";
import {
  createAdminChangelog,
  deleteAdminChangelog,
  getChangelog,
  listChangelogs,
  updateAdminChangelog,
  type CreateChangelogParams,
  type UpdateChangelogParams,
} from "../service/admin-changelogs.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:changelogs:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const orderBy = (req.query.order_by as "release_date" | "order") || "release_date";

    const { data: changelogs, count } = await listChangelogs({
      limit,
      offset,
      orderBy,
    });

    return res.json({
      data: changelogs,
      pagination: {
        limit,
        offset,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/changelogs: %o", error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch changelogs",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid changelog ID",
      });
    }

    const changelog = await getChangelog(id);

    if (!changelog) {
      return res.status(404).json({
        error: "Not Found",
        message: "Changelog not found",
      });
    }

    return res.json(changelog);
  } catch (error: any) {
    logger.error("Unexpected error in GET /admin/changelogs/:id: %o", error instanceof Error ? error : new Error(String(error)));

    if (error.code === "PGRST116") {
      return res.status(404).json({
        error: "Not Found",
        message: "Changelog not found",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch changelog",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
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

    const { version, title, release_date, s3_key, is_published, order } = req.body;

    if (!version || typeof version !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "version is required",
      });
    }

    if (!title || typeof title !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "title is required",
      });
    }

    if (!release_date) {
      return res.status(400).json({
        error: "Bad Request",
        message: "release_date is required",
      });
    }

    if (!s3_key || typeof s3_key !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "s3_key is required",
      });
    }

    const params: CreateChangelogParams = {
      version,
      title,
      releaseDate: new Date(release_date),
      s3Key: s3_key,
      createdBy: userId,
      isPublished: is_published ?? false,
      order: order ?? null,
    };

    const changelog = await createAdminChangelog(params);

    logger.info("Changelog created successfully: %s", changelog.id);
    return res.status(201).json(changelog);
  } catch (error: any) {
    logger.error("Unexpected error in POST /admin/changelogs: %o", error instanceof Error ? error : new Error(String(error)));

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Conflict",
        message: "A changelog with this version already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create changelog",
    });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid changelog ID",
      });
    }

    const { version, title, release_date, s3_key, is_published, order } = req.body;

    const params: UpdateChangelogParams = {};
    if (version !== undefined) params.version = version;
    if (title !== undefined) params.title = title;
    if (release_date !== undefined) params.releaseDate = new Date(release_date);
    if (s3_key !== undefined) params.s3Key = s3_key;
    if (is_published !== undefined) params.isPublished = is_published;
    if (order !== undefined) params.order = order;

    const changelog = await updateAdminChangelog(id, params);

    logger.info("Changelog updated successfully: %s", id);
    return res.json(changelog);
  } catch (error: any) {
    logger.error("Unexpected error in PUT /admin/changelogs/:id: %o", error instanceof Error ? error : new Error(String(error)));

    if (error.message === "Changelog not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Conflict",
        message: "A changelog with this version already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update changelog",
    });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid changelog ID",
      });
    }

    const { version, title, release_date, s3_key, is_published, order } = req.body;

    const params: UpdateChangelogParams = {};
    if (version !== undefined) params.version = version;
    if (title !== undefined) params.title = title;
    if (release_date !== undefined) params.releaseDate = new Date(release_date);
    if (s3_key !== undefined) params.s3Key = s3_key;
    if (is_published !== undefined) params.isPublished = is_published;
    if (order !== undefined) params.order = order;

    const changelog = await updateAdminChangelog(id, params);

    logger.info("Changelog updated successfully: %s", id);
    return res.json(changelog);
  } catch (error: any) {
    logger.error("Unexpected error in PATCH /admin/changelogs/:id: %o", error instanceof Error ? error : new Error(String(error)));

    if (error.message === "Changelog not found") {
      return res.status(404).json({
        error: "Not Found",
        message: error.message,
      });
    }

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Conflict",
        message: "A changelog with this version already exists",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update changelog",
    });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid changelog ID",
      });
    }

    const changelog = await getChangelog(id);
    if (!changelog) {
      return res.status(404).json({
        error: "Not Found",
        message: "Changelog not found",
      });
    }

    await deleteAdminChangelog(id);

    logger.info("Changelog deleted successfully: %s", id);
    return res.json({
      success: true,
      message: "Changelog deleted successfully",
    });
  } catch (error: any) {
    logger.error("Unexpected error in DELETE /admin/changelogs/:id: %o", error instanceof Error ? error : new Error(String(error)));

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to delete changelog",
    });
  }
});

export default router;

