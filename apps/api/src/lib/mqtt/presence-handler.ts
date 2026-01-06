import { getAdminSocketIds, removeAdminSocket } from '../admin-cache.js'

import { createSocketServer } from '@/socket/index.js'
import { logger } from '../../utils/logger.js'
import { redisClient } from '../redis/client.js'

let ioRef: ReturnType<typeof createSocketServer> | null = null

export function attachSocketIO(io: ReturnType<typeof createSocketServer>): void {
  ioRef = io
  logger.done('Socket.IO attached to MQTT presence handler')
}

/**
 * Handle presence message from MQTT
 */
export async function handlePresenceMessage(
  clientId: string,
  state: string
): Promise<void> {
  const now = Date.now()

  logger.info(`Handling presence message for ${clientId} with state ${state}`)

  // Update Redis presence data
  await redisClient.hSet('presence', clientId, state)
  await redisClient.hSet('presence:ts', clientId, now.toString())

  // Update matchmaking availability
  if (state === 'available') {
    await redisClient.sAdd('match:available', clientId)
    await redisClient.sRem('match:in_call', clientId)
  } else if (state === 'in_call') {
    await redisClient.sRem('match:available', clientId)
    await redisClient.sAdd('match:in_call', clientId)
  }

  // Clean up on offline
  if (state === 'offline') {
    await redisClient.hDel('presence', clientId)
    await redisClient.hDel('presence:ts', clientId)
    await redisClient.sRem('match:available', clientId)
    await redisClient.sRem('match:in_call', clientId)
  }

  // Emit to admin sockets
  emitToAdminSockets(clientId, state, now)
}

/**
 * Emit presence update to all admin sockets
 */
function emitToAdminSockets(clientId: string, state: string, updatedAt: number): void {
  if (!ioRef) return

  const adminSocketIds = getAdminSocketIds()
  if (adminSocketIds.size === 0) return

  const presenceUpdate = {
    userId: clientId,
    state,
    updatedAt,
  }

  // Emit to all admin sockets using the cached IDs
  // Clean up disconnected sockets while iterating
  const socketIds = Array.from(adminSocketIds)
  for (const socketId of socketIds) {
    const socket = ioRef.sockets.sockets.get(socketId)
    if (socket) {
      socket.emit('presence_update', presenceUpdate)
    } else {
      // Socket disconnected, remove from cache
      removeAdminSocket(socketId)
    }
  }
}

