export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL as string || 'http://localhost:3001',
  mqttUrl: process.env.NEXT_PUBLIC_MQTT_CLIENT_URL as string,
  mqttPort: process.env.NEXT_PUBLIC_MQTT_CLIENT_PORT as string,
  mqttUsername: process.env.NEXT_PUBLIC_MQTT_CLIENT_USERNAME as string,
  mqttPassword: process.env.NEXT_PUBLIC_MQTT_CLIENT_PASSWORD as string,
}