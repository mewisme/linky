import {
  getAllAdminConfig,
  getAdminConfigByKey,
  setAdminConfig,
  unsetAdminConfig,
  type AdminConfigRow,
} from "@/infra/supabase/repositories/admin-config.js";
import type { Json } from "@ws/database-types";

export type { AdminConfigRow };

export async function listAdminConfig(): Promise<AdminConfigRow[]> {
  return getAllAdminConfig();
}

export async function getConfigByKey(key: string): Promise<AdminConfigRow | null> {
  return getAdminConfigByKey(key);
}

export async function setConfig(key: string, value: Json): Promise<AdminConfigRow> {
  return setAdminConfig(key, value);
}

export async function unsetConfig(key: string): Promise<void> {
  return unsetAdminConfig(key);
}
