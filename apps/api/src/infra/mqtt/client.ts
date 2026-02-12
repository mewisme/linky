import { attachSocketIO as attachSocketIOToPresenceHandler, handlePresenceMessage } from './presence-handler.js'

import { config } from '@/config/index.js'
import { createLogger } from '@ws/logger'
import { createSocketServer } from '@/socket/index.js'
import { initializeAdminCache } from '@/infra/admin-cache/index.js'
import mqtt from 'mqtt'

const logger = createLogger("infra:mqtt:client");

export const mqttClient = mqtt.connect(
  `mqtts://${config.mqttUrl}:${config.mqttPort}`,
  {
    clientId: `service-backend-${Math.random().toString(16).substring(2, 8)}`,
    username: config.mqttUsername,
    password: config.mqttPassword,
    keepalive: 30,
    reconnectPeriod: 2000,
  }
)

mqttClient.on('connect', () => {
  logger.info('MQTT Client connected')

  mqttClient.subscribe('presence/+', { qos: 0 }, (error) => {
    if (error) {
      logger.error('MQTT Subscribe error: %o', error)
      return
    }
    logger.info('MQTT Subscribed to presence/+')
  })
})

mqttClient.on('message', async (topic, message) => {
  if (!topic.startsWith('presence/')) return
  const clientId = topic.replace('presence/', '')
  let payload: { state?: string }
  try {
    payload = JSON.parse(message.toString())
  } catch {
    return
  }
  const state = payload.state
  if (!state) return

  await handlePresenceMessage(clientId, state)
})

export function attachSocketIO(io: ReturnType<typeof createSocketServer>): void {
  attachSocketIOToPresenceHandler(io)
}

export function initializeMqttClient(): void {
  logger.info('MQTT Client initialized')

  initializeAdminCache().catch((error) => {
    logger.error('Failed to initialize admin cache: %o', error)
  })
}

