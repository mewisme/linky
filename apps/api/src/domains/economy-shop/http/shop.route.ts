import { getShop, purchaseShopItem, ShopError } from "@/domains/economy-shop/service/shop.service.js";
import type { PurchaseShopItemBody } from "@/domains/economy-shop/types/shop.types.js";
import { getUserInternalId } from "@/infra/supabase/repositories/users.js";
import { createLogger } from "@/utils/logger.js";
import { Router, type Request, type Response, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
const logger = createLogger("api:economy-shop:route");

router.get("/", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserInternalId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const items = await getShop(userId);
    return res.json(items);
  } catch (err) {
    logger.error(err as Error, "Unexpected error in GET /economy/shop");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fetch shop",
    });
  }
});

router.post("/purchase", async (req: Request, res: Response) => {
  try {
    const clerkUserId = req.auth?.sub;
    if (!clerkUserId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User ID not found in authentication token",
      });
    }

    const userId = await getUserInternalId(clerkUserId);
    if (!userId) {
      return res.status(404).json({
        error: "Not Found",
        message: "User not found in database",
      });
    }

    const body = req.body as PurchaseShopItemBody;
    const itemId = typeof body?.itemId === "string" ? body.itemId.trim() : undefined;
    if (!itemId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "itemId is required",
      });
    }

    const result = await purchaseShopItem(userId, itemId);
    return res.json(result);
  } catch (err) {
    if (err instanceof ShopError) {
      if (err.code === "ITEM_NOT_FOUND") {
        return res.status(404).json({ error: "Not Found", message: err.message });
      }
      if (err.code === "ALREADY_OWNED") {
        return res.status(409).json({ error: "Conflict", message: err.message });
      }
      if (err.code === "INSUFFICIENT_COINS") {
        return res.status(422).json({ error: "Unprocessable Entity", message: err.message });
      }
    }
    logger.error(err as Error, "Unexpected error in POST /economy/shop/purchase");
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to purchase item",
    });
  }
});

export default router;
