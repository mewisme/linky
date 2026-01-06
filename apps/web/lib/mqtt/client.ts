import mqtt, { MqttClient } from 'mqtt'

import { config } from '@/shared/config'
import { logger } from '@/utils/logger';

let client: MqttClient | null = null

export function createMqttClient(userId: string): MqttClient {
  if (client) return client;

  // Validate MQTT configuration
  const mqttUrl = config.mqttUrl;
  const mqttPort = config.mqttPort;
  const mqttUsername = config.mqttUsername;
  const mqttPassword = config.mqttPassword;

  if (!mqttUrl || !mqttPort || !mqttUsername || !mqttPassword) {
    const missing = [];
    if (!mqttUrl) missing.push('NEXT_PUBLIC_MQTT_CLIENT_URL');
    if (!mqttPort) missing.push('NEXT_PUBLIC_MQTT_CLIENT_PORT');
    if (!mqttUsername) missing.push('NEXT_PUBLIC_MQTT_CLIENT_USERNAME');
    if (!mqttPassword) missing.push('NEXT_PUBLIC_MQTT_CLIENT_PASSWORD');

    const error = new Error(
      `Missing MQTT environment variables: ${missing.join(', ')}. ` +
      `Please ensure these are set in Vercel project settings and rebuild the application.`
    );
    logger.error(error.message);
    throw error;
  }

  const mqttFullUrl = `wss://${mqttUrl}:${mqttPort}/mqtt`

  logger.info(`Connecting to MQTT broker at ${mqttFullUrl}`)

  client = mqtt.connect(mqttFullUrl, {
    clientId: userId,
    username: mqttUsername,
    password: mqttPassword,
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