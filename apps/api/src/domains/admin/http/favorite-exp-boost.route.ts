import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@repo/logger";
import {
  listFavoriteExpBoostRules,
  getFavoriteExpBoostRules,
  createFavoriteExpBoostRules,
  updateFavoriteExpBoostRules,
  deleteFavoriteExpBoostRules,
} from "../service/admin-favorite-exp-boost.service.js";

const router: ExpressRouter = Router();
const logger = createLogger("API:Admin:FavoriteExpBoost:Route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const rules = await listFavoriteExpBoostRules();
    return res.json({ data: rules });
  } catch (error) {
    logger.error(
      "Unexpected error in GET /admin/favorite-exp-boost: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch favorite EXP boost rules" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "Invalid ID" });
    }
    const rule = await getFavoriteExpBoostRules(id);
    if (!rule) {
      return res.status(404).json({ error: "Not Found", message: "Favorite EXP boost rule not found" });
    }
    return res.json(rule);
  } catch (error) {
    logger.error(
      "Unexpected error in GET /admin/favorite-exp-boost/:id: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch favorite EXP boost rule" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body as { one_way_multiplier?: number; mutual_multiplier?: number };
    const one = body?.one_way_multiplier ?? 1;
    const mutual = body?.mutual_multiplier ?? 1;
    if (typeof one !== "number" || one < 1) {
      return res.status(400).json({ error: "Bad Request", message: "one_way_multiplier must be >= 1" });
    }
    if (typeof mutual !== "number" || mutual < 1) {
      return res.status(400).json({ error: "Bad Request", message: "mutual_multiplier must be >= 1" });
    }
    const created = await createFavoriteExpBoostRules({ one_way_multiplier: one, mutual_multiplier: mutual });
    logger.info("Admin created favorite EXP boost rule: %s", created.id);
    return res.status(201).json(created);
  } catch (error) {
    logger.error(
      "Unexpected error in POST /admin/favorite-exp-boost: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to create favorite EXP boost rule" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "Invalid ID" });
    }
    const body = req.body as { one_way_multiplier?: number; mutual_multiplier?: number };
    const patch: { one_way_multiplier?: number; mutual_multiplier?: number } = {};
    if (typeof body?.one_way_multiplier === "number") {
      if (body.one_way_multiplier < 1) {
        return res.status(400).json({ error: "Bad Request", message: "one_way_multiplier must be >= 1" });
      }
      patch.one_way_multiplier = body.one_way_multiplier;
    }
    if (typeof body?.mutual_multiplier === "number") {
      if (body.mutual_multiplier < 1) {
        return res.status(400).json({ error: "Bad Request", message: "mutual_multiplier must be >= 1" });
      }
      patch.mutual_multiplier = body.mutual_multiplier;
    }
    const updated = await updateFavoriteExpBoostRules(id, patch);
    logger.info("Admin updated favorite EXP boost rule: %s", id);
    return res.json(updated);
  } catch (error) {
    logger.error(
      "Unexpected error in PUT /admin/favorite-exp-boost/:id: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to update favorite EXP boost rule" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "Invalid ID" });
    }
    const body = req.body as { one_way_multiplier?: number; mutual_multiplier?: number };
    const patch: { one_way_multiplier?: number; mutual_multiplier?: number } = {};
    if (typeof body?.one_way_multiplier === "number") {
      if (body.one_way_multiplier < 1) {
        return res.status(400).json({ error: "Bad Request", message: "one_way_multiplier must be >= 1" });
      }
      patch.one_way_multiplier = body.one_way_multiplier;
    }
    if (typeof body?.mutual_multiplier === "number") {
      if (body.mutual_multiplier < 1) {
        return res.status(400).json({ error: "Bad Request", message: "mutual_multiplier must be >= 1" });
      }
      patch.mutual_multiplier = body.mutual_multiplier;
    }
    const updated = await updateFavoriteExpBoostRules(id, patch);
    logger.info("Admin patched favorite EXP boost rule: %s", id);
    return res.json(updated);
  } catch (error) {
    logger.error(
      "Unexpected error in PATCH /admin/favorite-exp-boost/:id: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to update favorite EXP boost rule" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Bad Request", message: "Invalid ID" });
    }
    await deleteFavoriteExpBoostRules(id);
    logger.info("Admin deleted favorite EXP boost rule: %s", id);
    return res.json({ message: "Favorite EXP boost rule deleted successfully" });
  } catch (error) {
    logger.error(
      "Unexpected error in DELETE /admin/favorite-exp-boost/:id: %o",
      error instanceof Error ? error : new Error(String(error)),
    );
    return res.status(500).json({ error: "Internal Server Error", message: "Failed to delete favorite EXP boost rule" });
  }
});

export default router;
