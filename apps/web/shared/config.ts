function getEnv(key: string, required = false): string {
  const value = process.env[key];

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Please set it in Vercel project settings.`
    );
  }

  return value || '';
}

export const config = {
  get apiUrl() {
    return getEnv('NEXT_PUBLIC_API_URL') || 'http://localhost:3001';
  },
  get mqttUrl() {
    return getEnv('NEXT_PUBLIC_MQTT_CLIENT_URL', true);
  },
  get mqttPort() {
    return getEnv('NEXT_PUBLIC_MQTT_CLIENT_PORT', true);
  },
  get mqttUsername() {
    return getEnv('NEXT_PUBLIC_MQTT_CLIENT_USERNAME', true);
  },
  get mqttPassword() {
    return getEnv('NEXT_PUBLIC_MQTT_CLIENT_PASSWORD', true);
  },
};