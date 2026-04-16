import { config as loadDotenv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "redis";

import { getWorkerRedisOptions } from "./redis-options.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(currentDir, "../../../.env");
loadDotenv({ path: rootEnvPath, quiet: true });

const hardFail = setTimeout(() => process.exit(1), 4000);

async function run(): Promise<void> {
  const client = createClient(getWorkerRedisOptions());
  try {
    await client.connect();
    if ((await client.ping()) !== "PONG") {
      process.exitCode = 1;
    }
  } finally {
    try {
      await client.quit();
    } catch {
      client.disconnect();
    }
  }
}

void run()
  .then(() => {
    clearTimeout(hardFail);
    process.exit(process.exitCode ?? 0);
  })
  .catch(() => {
    clearTimeout(hardFail);
    process.exit(1);
  });
