import { createLogger } from "@/utils/logger.js";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-season:service:economy-metrics");

export async function snapshotTodayMetrics(): Promise<void> {
  const { error } = await supabase.rpc("snapshot_economy_metrics");

  if (error) {
    logger.error(error as Error, "Error snapshotting economy metrics");
    throw error;
  }

  logger.info("Economy metrics snapshot completed");
}
