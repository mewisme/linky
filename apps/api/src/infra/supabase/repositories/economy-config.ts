import type { Json } from "@/types/database/supabase.types.js";
import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("infra:supabase:repositories:economy-config");

export async function getEconomyConfigValue<T = number>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("economy_config")
    .select("value_json")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    logger.error(error as Error, "Error fetching economy config %s", key);
    throw error;
  }

  if (data?.value_json === undefined || data?.value_json === null) return null;

  return data.value_json as T;
}

export async function setEconomyConfigValue(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("economy_config")
    .upsert({ key, value_json: value as Json }, { onConflict: "key" });

  if (error) {
    logger.error(error as Error, "Error setting economy config %s", key);
    throw error;
  }
}
