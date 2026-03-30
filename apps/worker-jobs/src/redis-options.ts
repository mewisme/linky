import type { RedisClientOptions } from "redis";

import { getRuntimeConfigFromEnv } from "@ws/config";

export function getWorkerRedisOptions(): RedisClientOptions {
  const runtimeConfig = getRuntimeConfigFromEnv();

  if (runtimeConfig.redisUrl && runtimeConfig.redisUrl.startsWith("redis://")) {
    return {
      url: runtimeConfig.redisUrl,
      username: runtimeConfig.redisUsername || undefined,
      password: runtimeConfig.redisPassword || undefined,
    };
  }

  return {
    username: runtimeConfig.redisUsername,
    password: runtimeConfig.redisPassword,
    socket: {
      host: runtimeConfig.redisUrl || "localhost",
      port: Number(runtimeConfig.redisPort) || 6379,
    },
  };
}
