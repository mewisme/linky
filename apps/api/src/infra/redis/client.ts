import { RedisClientType, RedisFunctions, RedisModules, RedisScripts, RespVersions, TypeMapping, createClient } from 'redis'

import { config } from '@/config/index.js'
import { createLogger } from '@/utils/logger.js'
import { toLoggableError } from '@/utils/to-loggable-error.js'

const logger = createLogger("infra:redis:client");

const redisConfig = config.redisUrl && config.redisUrl.startsWith('redis://')
  ? {
    url: config.redisUrl,
    username: config.redisUsername || undefined,
    password: config.redisPassword || undefined,
  }
  : {
    username: config.redisUsername,
    password: config.redisPassword,
    socket: {
      host: config.redisUrl || 'localhost',
      port: Number(config.redisPort) || 6379
    }
  }

export const redisClient = createClient(redisConfig) as RedisClientType<RedisModules, RedisFunctions, RedisScripts, RespVersions, TypeMapping>

redisClient.on('error', (err) => {
  logger.error(toLoggableError(err), "Redis Client Error")
})

redisClient.on('connect', () => {
  logger.info('Redis Client connecting...')
})

redisClient.on('ready', () => {
  logger.info('Redis Client connected and ready')
})

redisClient.on('reconnecting', () => {
  logger.info('Redis Client reconnecting...')
})

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect()
  } catch (error: unknown) {
    logger.error(toLoggableError(error), "Failed to connect to Redis")
    throw error
  }
}
