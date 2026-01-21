import { RedisClientType, RedisFunctions, RedisModules, RedisScripts, RespVersions, TypeMapping, createClient } from 'redis'

import { config } from '../../config/index.js'
import { createLogger } from '@repo/logger/api'

const logger = createLogger("API:Redis:Client");

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
  logger.error('Redis Client Error: %o', err instanceof Error ? err : new Error(String(err)))
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
  } catch (error) {
    logger.error('Failed to connect to Redis: %o', error instanceof Error ? error : new Error(String(error as string)))
    throw error
  }
}
