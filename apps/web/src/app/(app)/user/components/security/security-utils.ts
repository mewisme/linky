export function getClerkErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  const e = error as { errors?: Array<{ message?: string; longMessage?: string }> }
  const first = e?.errors?.[0]
  return first?.longMessage ?? first?.message ?? 'Something went wrong'
}

export function getPasswordStrength(value: string): 'Weak' | 'Medium' | 'Strong' | null {
  if (value.length === 0) return null
  if (value.length < 8) return 'Weak'
  if (value.length < 12) return 'Medium'
  return 'Strong'
}

export function formatProvider(provider: string): string {
  const s = provider.replace(/^oauth_/, '')
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export function formatDeviceLabel(
  activity: { browserName?: string; deviceType?: string } | null | undefined
): string {
  if (!activity) return 'Unknown device'
  const parts = [activity.deviceType, activity.browserName].filter(Boolean)
  return parts.length > 0 ? parts.join(' - ') : 'Unknown device'
}

export function formatLocation(
  activity: { city?: string; country?: string } | null | undefined
): string | null {
  if (!activity) return null
  const parts = [activity.city, activity.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

const TOTP_ISSUER = 'Linky'

export function buildTotpUri(account: string, secret: string, issuer: string = TOTP_ISSUER): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedAccount = encodeURIComponent(account)
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}`
}
