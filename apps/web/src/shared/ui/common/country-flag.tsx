'use client'

import 'country-flag-icons/3x2/flags.css'

import { hasFlag } from 'country-flag-icons'
import getCountryFlagUnicode from 'country-flag-icons/unicode'

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

  if (hasFlag(normalizedCode)) {
    return (
      <span
        className={cn(`flag:${normalizedCode}`, 'inline-block', className)}
        aria-hidden
      />
    )
  }

  if (/^[A-Z]{2}$/.test(normalizedCode)) {
    return (
      <span
        className={cn('inline-flex items-center justify-center text-base leading-none', className)}
        aria-hidden
      >
        {getCountryFlagUnicode(normalizedCode)}
      </span>
    )
  }

  return null
}
