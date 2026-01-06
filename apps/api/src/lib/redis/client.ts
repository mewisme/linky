import { RedisClientType, RedisFunctions, RedisModules, RedisScripts, RespVersions, TypeMapping, createClient } from 'redis'

import { config } from '../../config/index.js'
import { logger } from '../../utils/logger.js'

export const redisClient = createClient({
  username: config.redisUsername,
  password: config.redisPassword,
  socket: {
    host: config.redisUrl,
    port: Number(config.redisPort)
  }
}) as RedisClientType<RedisModules, RedisFunctions, RedisScripts, RespVersions, TypeMapping>

// Handle Redis connection events
redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err)
})

redisClient.on('connect', () => {
  logger.load('Redis Client connecting...')
})

redisClient.on('ready', () => {
  logger.done('Redis Client connected and ready')
})

redisClient.on('reconnecting', () => {
  logger.load('Redis Client reconnecting...')
})

// Connect to Redis
export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect()
  } catch (error) {
    logger.error('Failed to connect to Redis:', error)
    throw error
  }
}