import type {
  PurchaseShopItemRpcRow,
  ShopItem,
  ShopItemRecord,
} from "@/domains/economy-shop/types/shop.types.js";
import { getActiveShopItems, getUserOwnedItemIds } from "@/domains/economy-shop/repository/shop.repository.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-shop:service:shop");

export class ShopError extends Error {
  constructor(
    message: string,
    public readonly code: "ITEM_NOT_FOUND" | "ALREADY_OWNED" | "INSUFFICIENT_COINS"
  ) {
    super(message);
    this.name = "ShopError";
  }
}

function toShopItem(record: ShopItemRecord, owned: boolean): ShopItem {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    type: record.type,
    price: record.price,
    metadata: record.metadata,
    owned,
  };
}

export async function getShop(userId: string): Promise<ShopItem[]> {
  const [items, ownedIds] = await Promise.all([
    getActiveShopItems(),
    getUserOwnedItemIds(userId),
  ]);
  return items.map((r) => toShopItem(r, ownedIds.has(r.id)));
}

export async function purchaseShopItem(
  userId: string,
  itemId: string
): Promise<{ newCoinBalance: number }> {
  const { data, error } = await supabase.rpc("purchase_shop_item", {
    p_user_id: userId,
    p_item_id: itemId,
  });

  if (error) {
    const msg = (error as { message?: string }).message ?? String(error);
    if (msg.includes("ITEM_NOT_FOUND")) {
      throw new ShopError("Item not found or inactive", "ITEM_NOT_FOUND");
    }
    if (msg.includes("ALREADY_OWNED")) {
      throw new ShopError("Already owned", "ALREADY_OWNED");
    }
    if (msg.includes("INSUFFICIENT_COINS")) {
      throw new ShopError("Insufficient coins", "INSUFFICIENT_COINS");
    }
    logger.error("Error purchasing shop item: %o", error as Error);
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as PurchaseShopItemRpcRow) : (data as PurchaseShopItemRpcRow);
  if (!row) {
    logger.error("purchase_shop_item RPC returned no row");
    throw new Error("Purchase failed");
  }
  return { newCoinBalance: row.new_coin_balance };
}
