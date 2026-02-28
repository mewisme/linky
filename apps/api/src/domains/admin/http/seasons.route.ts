import {
  createAdminSeason,
  forceDecaySeason,
  getAdminSeason,
  listAdminSeasons,
  updateAdminSeason,
} from "@/domains/admin/service/admin-seasons.service.js";
import type { CreateSeasonBody, UpdateSeasonBody } from "@/domains/economy-season/types/season.types.js";
import { createLogger } from "@ws/logger";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:seasons:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const seasons = await listAdminSeasons();
    return res.json({ data: seasons });
  } catch (error) {
    logger.error("Unexpected error in GET /admin/seasons: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch seasons",
    });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid season ID",
      });
    }
    const season = await getAdminSeason(id);
    if (!season) {
      return res.status(404).json({
        error: "Not Found",
        message: "Season not found",
      });
    }
    return res.json(season);
  } catch (error) {
    logger.error("Unexpected error in GET /admin/seasons/:id: %o", error as Error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch season",
    });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateSeasonBody;
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "name is required and must be a non-empty string",
      });
    }
    if (!body.startAt || typeof body.startAt !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "startAt is required (ISO date string)",
      });
    }
    if (!body.endAt || typeof body.endAt !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "endAt is required (ISO date string)",
      });
    }
    const created = await createAdminSeason(body);
    return res.status(201).json(created);
  } catch (error) {
    const err = error as Error & { code?: string };
    logger.error("Unexpected error in POST /admin/seasons: %o", err);
    if (err.code === "ACTIVE_SEASON_EXISTS") {
      return res.status(409).json({
        error: "Conflict",
        message: "Another season is already active",
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create season",
    });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid season ID",
      });
    }
    const body = req.body as UpdateSeasonBody;
    const updated = await updateAdminSeason(id, body);
    return res.json(updated);
  } catch (error) {
    const err = error as Error & { code?: string };
    logger.error("Unexpected error in PATCH /admin/seasons/:id: %o", err);
    if (err.code === "ACTIVE_SEASON_EXISTS") {
      return res.status(409).json({
        error: "Conflict",
        message: "Another season is already active",
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to update season",
    });
  }
});

router.post("/:id/force-decay", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid season ID",
      });
    }
    const result = await forceDecaySeason(id);
    return res.json(result);
  } catch (error) {
    const err = error as Error & { code?: string };
    logger.error("Unexpected error in POST /admin/seasons/:id/force-decay: %o", err);
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({
        error: "Not Found",
        message: "Season not found",
      });
    }
    if (err.code === "SEASON_NOT_EXPIRED") {
      return res.status(400).json({
        error: "Bad Request",
        message: "Season has not ended",
      });
    }
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to run force decay",
    });
  }
});

export default router;
