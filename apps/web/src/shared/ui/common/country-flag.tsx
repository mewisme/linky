import { hasFlag } from 'country-flag-icons'
import getCountryFlag from 'country-flag-icons/unicode'

import { cn } from '@ws/ui/lib/utils'

export { countries } from 'country-flag-icons'

interface CountryFlagProps {
  countryCode: string
  className?: string
}

export function CountryFlag({ countryCode, className }: CountryFlagProps) {
  if (!countryCode) {
    return null
  }

  const normalizedCode = countryCode.toUpperCase()
  if (!hasFlag(normalizedCode)) {
    return null
  }

  return (
    <span
      className={cn('inline-flex items-center justify-center text-base leading-none', className)}
      aria-hidden
    >
      {getCountryFlag(normalizedCode)}
    </span>
  )
}
