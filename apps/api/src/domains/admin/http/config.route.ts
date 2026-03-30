import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { requireSuperAdmin } from "@/lib/auth/role-guard.js";
import {
  listAdminConfig,
  getConfigByKey,
  setConfig,
  unsetConfig,
} from "@/domains/admin/service/admin-config.service.js";
import type { Json } from "@/types/database/supabase.types.js";

const router: ExpressRouter = Router();
const logger = createLogger("api:admin:config:route");

router.get("/", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await listAdminConfig();
    return res.json({ data: rows });
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/config");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch admin config",
    });
  }
});

router.get("/:key", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const rawKey = typeof req.params.key === "string" ? req.params.key : req.params.key?.[0];
    const key = rawKey?.trim();
    if (!key) {
      return res.status(400).json({ error: "Bad Request", message: "Invalid key" });
    }
    const row = await getConfigByKey(key);
    if (!row) {
      return res.status(404).json({ error: "Not Found", message: "Config key not found" });
    }
    return res.json(row);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/config/:key");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch config",
    });
  }
});

router.post("/", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body as { key?: string; value?: unknown };
    if (!key || typeof key !== "string" || !key.trim()) {
      return res.status(400).json({ error: "Bad Request", message: "key is required" });
    }
    if (value === undefined) {
      return res.status(400).json({ error: "Bad Request", message: "value is required" });
    }
    const row = await setConfig(key.trim(), value as Json);
    return res.status(201).json(row);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/config");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to set config",
    });
  }
});

router.delete("/:key", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const rawKey = typeof req.params.key === "string" ? req.params.key : req.params.key?.[0];
    const key = rawKey?.trim();
    if (!key) {
      return res.status(400).json({ error: "Bad Request", message: "Invalid key" });
    }
    const row = await getConfigByKey(key);
    if (!row) {
      return res.status(404).json({ error: "Not Found", message: "Config key not found" });
    }
    await unsetConfig(key);
    return res.status(204).send();
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /admin/config/:key");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to unset config",
    });
  }
});

export default router;
