function resolveRegionCode(code: string): string | null {
  const trimmed = code.trim()
  if (trimmed === '') {
    return null
  }
  if (trimmed.length === 2 && /^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }
  if (/^\d{1,3}$/.test(trimmed)) {
    return trimmed.padStart(3, '0')
  }
  return null
}

export function countryByIso(
  code: string | null | undefined,
  locale = 'en',
): { country: string } | null {
  if (code == null) {
    return null
  }
  const region = resolveRegionCode(String(code))
  if (!region) {
    return null
  }
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })
    const name = displayNames.of(region)
    if (!name || name === region) {
      return null
    }
    return { country: name }
  } catch {
    return null
  }
}
