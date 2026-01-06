import mqtt, { MqttClient } from 'mqtt'

import { config } from '@/shared/config'
import { logger } from '@/utils/logger';

let client: MqttClient | null = null

export function createMqttClient(userId: string): MqttClient {
  if (client) return client;

  const mqttFullUrl = `wss://${config.mqttUrl}:${config.mqttPort}/mqtt`

  logger.info(`Connecting to MQTT broker at ${mqttFullUrl}`)

  client = mqtt.connect(mqttFullUrl, {
    clientId: userId,
    username: config.mqttUsername,
    password: config.mqttPassword,
    keepalive: 30,
    reconnectPeriod: 2000,
    will: {
      topic: `presence/${userId}`,
      payload: JSON.stringify({ state: 'offline' }),
      retain: true,
    }
  })

  client.on('connect', () => {
    logger.info('MQTT client connected')
    publishPresence('online')
  })

  client.on('close', () => {
    logger.info('MQTT client closed')
    client = null
  })

  client.on('error', (error) => {
    logger.error('MQTT client error:', error)
  })

  return client
}

export function disconnectMqttClient() {
  if (!client) return;
  client.end()
  client = null
}

export function publishPresence(state: string) {
  if (!client) return;

  logger.info(`Publishing presence for ${client.options.clientId} with state ${state}`)

  client.publish(
    `presence/${client.options.clientId}`,
    JSON.stringify({ state }),
    { qos: 0, retain: true }
  );
}