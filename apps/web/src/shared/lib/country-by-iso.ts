import * as lookup from 'country-code-lookup'

export function countryByIso(
  code: string | null | undefined,
): ReturnType<typeof lookup.byIso> {
  if (code == null) {
    return null
  }
  const trimmed = code.trim()
  if (trimmed === '') {
    return null
  }
  if (
    trimmed.length !== 2 &&
    trimmed.length !== 3 &&
    !/^\d+$/.test(trimmed)
  ) {
    return null
  }
  try {
    return lookup.byIso(trimmed)
  } catch {
    return null
  }
}
