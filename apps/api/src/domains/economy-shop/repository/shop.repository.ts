import type { ShopItemRecord } from "@/domains/economy-shop/types/shop.types.js";
import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-shop:repository:shop");

export async function getActiveShopItems(): Promise<ShopItemRecord[]> {
  const { data, error } = await supabase
    .from("coin_shop_items")
    .select("*")
    .eq("is_active", true)
    .order("key", { ascending: true });

  if (error) {
    logger.error("Error fetching shop items: %o", error as Error);
    throw error;
  }
  return (data ?? []) as ShopItemRecord[];
}

export async function getUserOwnedItemIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_owned_items")
    .select("item_id")
    .eq("user_id", userId);

  if (error) {
    logger.error("Error fetching user owned items: %o", error as Error);
    throw error;
  }
  const ids = (data ?? []).map((r: { item_id: string }) => r.item_id);
  return new Set(ids);
}

export async function getShopItemById(itemId: string): Promise<ShopItemRecord | null> {
  const { data, error } = await supabase
    .from("coin_shop_items")
    .select("*")
    .eq("id", itemId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    logger.error("Error fetching shop item by id: %o", error as Error);
    throw error;
  }
  return data as ShopItemRecord | null;
}
