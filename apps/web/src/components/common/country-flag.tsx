import 'country-flag-icons/3x2/flags.css'

import * as Flags from 'country-flag-icons/react/3x2'

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
  const Flag = Flags[normalizedCode as keyof typeof Flags]

  if (!Flag) {
    return null
  }

  return <Flag className={cn('size-4', className)} />
}