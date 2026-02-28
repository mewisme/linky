export type ShopItemType = "avatar_frame" | "reaction_pack" | "profile_effect" | "video_overlay";

export interface ShopItemRecord {
  id: string;
  key: string;
  name: string;
  type: ShopItemType;
  price: number;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OwnedItemRecord {
  id: string;
  user_id: string;
  item_id: string;
  acquired_at: string;
}

export interface ShopItem {
  id: string;
  key: string;
  name: string;
  type: ShopItemType;
  price: number;
  metadata: Record<string, unknown> | null;
  owned: boolean;
}

export interface PurchaseShopItemBody {
  itemId: string;
}

export interface PurchaseShopItemResult {
  newCoinBalance: number;
}

export interface PurchaseShopItemRpcRow {
  new_coin_balance: number;
}
