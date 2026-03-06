import type { Json } from "@/types/database/supabase.types.js";
import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:admin-config");

export interface AdminConfigRow {
  key: string;
  value: Json | null;
}

export async function getAllAdminConfig(): Promise<AdminConfigRow[]> {
  const { data, error } = await supabase
    .from("admin_config")
    .select("key, value")
    .order("key", { ascending: true });

  if (error) {
    logger.error(error as Error, "Error fetching admin config");
    throw error;
  }

  return (data ?? []) as AdminConfigRow[];
}

export async function getAdminConfigByKey(key: string): Promise<AdminConfigRow | null> {
  const { data, error } = await supabase
    .from("admin_config")
    .select("key, value")
    .eq("key", key)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(error as Error, "Error fetching admin config by key");
    throw error;
  }

  return data as AdminConfigRow;
}

export async function setAdminConfig(key: string, value: Json): Promise<AdminConfigRow> {
  const { data, error } = await supabase
    .from("admin_config")
    .upsert({ key, value }, { onConflict: "key" })
    .select("key, value")
    .single();

  if (error) {
    logger.error(error as Error, "Error setting admin config");
    throw error;
  }

  return data as AdminConfigRow;
}

export async function unsetAdminConfig(key: string): Promise<void> {
  const { error } = await supabase.from("admin_config").delete().eq("key", key);

  if (error) {
    logger.error(error as Error, "Error unsetting admin config");
    throw error;
  }
}
