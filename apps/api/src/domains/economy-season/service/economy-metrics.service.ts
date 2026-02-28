import { createLogger } from "@ws/logger";
import { supabase } from "@/infra/supabase/client.js";

const logger = createLogger("economy-season:service:economy-metrics");

export async function snapshotTodayMetrics(): Promise<void> {
  const { error } = await supabase.rpc("snapshot_economy_metrics");

  if (error) {
    logger.error("Error snapshotting economy metrics: %o", error as Error);
    throw error;
  }

  logger.info("Economy metrics snapshot completed");
}
