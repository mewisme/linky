import mqtt, { MqttClient } from 'mqtt'

import { publicEnv } from "@/env/public-env";

let client: MqttClient | null = null

export function createMqttClient(userId: string): MqttClient {
  if (client) return client;

  const mqttUrl = publicEnv.MQTT_CLIENT_URL;
  const mqttPort = publicEnv.MQTT_CLIENT_PORT;
  const mqttUsername = publicEnv.MQTT_CLIENT_USERNAME;
  const mqttPassword = publicEnv.MQTT_CLIENT_PASSWORD;

  if (!mqttUrl || !mqttPort) {
    throw new Error("MQTT is not configured: NEXT_PUBLIC_MQTT_CLIENT_URL and NEXT_PUBLIC_MQTT_CLIENT_PORT are required");
  }

  const mqttFullUrl = `wss://${mqttUrl}:${mqttPort}/mqtt`

  console.info(`Connecting to MQTT broker at ${mqttFullUrl}`)

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
    console.info('MQTT client connected')
    publishPresence('online')
  })

  client.on('close', () => {
    console.info('MQTT client closed')
    client = null
  })

  client.on('error', (error) => {
    console.error('MQTT client error:', error)
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

  console.info(`Publishing presence for ${client.options.clientId} with state ${state}`)

  client.publish(
    `presence/${client.options.clientId}`,
    JSON.stringify({ state }),
    { qos: 0, retain: true }
  );
}