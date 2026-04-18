export function getClerkErrorMessage(error: unknown, fallbackMessage = 'Something went wrong'): string {
  if (error instanceof Error) return error.message
  const e = error as { errors?: Array<{ message?: string; longMessage?: string }> }
  const first = e?.errors?.[0]
  return first?.longMessage ?? first?.message ?? fallbackMessage
}

export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong'

export function getPasswordStrength(value: string): PasswordStrengthLevel | null {
  if (value.length === 0) return null
  if (value.length < 8) return 'weak'
  if (value.length < 12) return 'medium'
  return 'strong'
}

export function formatDeviceLabel(
  activity: { browserName?: string; deviceType?: string } | null | undefined,
  unknownDevice: string,
): string {
  if (!activity) return unknownDevice
  const parts = [activity.deviceType, activity.browserName].filter(Boolean)
  return parts.length > 0 ? parts.join(' - ') : unknownDevice
}

export function formatLocation(
  activity: { city?: string; country?: string } | null | undefined
): string | null {
  if (!activity) return null
  const parts = [activity.city, activity.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}
