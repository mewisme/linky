import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { um } from "@/lib/api-user-message.js";
import { sendJsonError } from "@/lib/http-json-response.js";
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
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_ADMIN_CONFIG", "failedFetchAdminConfig", "Failed to fetch admin config"),
    );
  }
});

router.get("/:key", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const rawKey = typeof req.params.key === "string" ? req.params.key : req.params.key?.[0];
    const key = rawKey?.trim();
    if (!key) {
      return sendJsonError(res, 400, "Bad Request", um("CONFIG_INVALID_KEY", "invalidKey", "Invalid key"));
    }
    const row = await getConfigByKey(key);
    if (!row) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("CONFIG_KEY_NOT_FOUND", "configKeyNotFound", "Config key not found"),
      );
    }
    return res.json(row);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in GET /admin/config/:key");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_FETCH_CONFIG", "failedFetchConfig", "Failed to fetch config"),
    );
  }
});

router.post("/", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body as { key?: string; value?: unknown };
    if (!key || typeof key !== "string" || !key.trim()) {
      return sendJsonError(res, 400, "Bad Request", um("CONFIG_KEY_REQUIRED", "keyRequired", "key is required"));
    }
    if (value === undefined) {
      return sendJsonError(res, 400, "Bad Request", um("CONFIG_VALUE_REQUIRED", "valueRequired", "value is required"));
    }
    const row = await setConfig(key.trim(), value as Json);
    return res.status(201).json(row);
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in POST /admin/config");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_SET_CONFIG", "failedSetConfig", "Failed to set config"),
    );
  }
});

router.delete("/:key", requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const rawKey = typeof req.params.key === "string" ? req.params.key : req.params.key?.[0];
    const key = rawKey?.trim();
    if (!key) {
      return sendJsonError(res, 400, "Bad Request", um("CONFIG_INVALID_KEY_DEL", "invalidKey", "Invalid key"));
    }
    const row = await getConfigByKey(key);
    if (!row) {
      return sendJsonError(
        res,
        404,
        "Not Found",
        um("CONFIG_KEY_NOT_FOUND_DEL", "configKeyNotFound", "Config key not found"),
      );
    }
    await unsetConfig(key);
    return res.status(204).send();
  } catch (error) {
    logger.error(toLoggableError(error), "Unexpected error in DELETE /admin/config/:key");
    return sendJsonError(
      res,
      500,
      "Internal Server Error",
      um("FAILED_UNSET_CONFIG", "failedUnsetConfig", "Failed to unset config"),
    );
  }
});

export default router;
