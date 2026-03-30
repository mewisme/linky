import type { Json } from "@/types/database/supabase.types.js";
import { createLogger } from "@/utils/logger.js";
import { toLoggableError } from "@/utils/to-loggable-error.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:admin-config");

export interface AdminConfigRow<T = Json> {
  key: string;
  value: T | null;
}

export async function getAllAdminConfig(): Promise<AdminConfigRow[]> {
  const { data, error } = await supabase
    .from("admin_config")
    .select("key, value")
    .order("key", { ascending: true });

  if (error) {
    logger.error(toLoggableError(error), "Error fetching admin config");
    throw error;
  }

  return (data ?? []) as AdminConfigRow[];
}

export async function getAdminConfigByKey<T = Json>(key: string): Promise<AdminConfigRow<T> | null> {
  const { data, error } = await supabase
    .from("admin_config")
    .select("key, value")
    .eq("key", key)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    logger.error(toLoggableError(error), "Error fetching admin config by key");
    throw error;
  }

  return data as AdminConfigRow<T>;
}

export async function setAdminConfig(key: string, value: Json): Promise<AdminConfigRow> {
  const { data, error } = await supabase
    .from("admin_config")
    .upsert({ key, value }, { onConflict: "key" })
    .select("key, value")
    .single();

  if (error) {
    logger.error(toLoggableError(error), "Error setting admin config");
    throw error;
  }

  return data as AdminConfigRow;
}

export async function unsetAdminConfig(key: string): Promise<void> {
  const { error } = await supabase.from("admin_config").delete().eq("key", key);

  if (error) {
    logger.error(toLoggableError(error), "Error unsetting admin config");
    throw error;
  }
}
