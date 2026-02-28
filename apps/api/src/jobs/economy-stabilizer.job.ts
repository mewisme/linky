import { runStabilizer } from "@/contexts/economy-stabilizer.context.js";

export async function runStabilizerJob(): Promise<void> {
  await runStabilizer();
}
