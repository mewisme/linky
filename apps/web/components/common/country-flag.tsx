import 'country-flag-icons/3x2/flags.css'

import * as Flags from 'country-flag-icons/react/3x2'

import { cn } from '@repo/ui/lib/utils'

interface CountryFlagProps {
  countryCode: string
  className?: string
}

export function CountryFlag({ countryCode, className }: CountryFlagProps) {
  const Flag = Flags[`${countryCode}` as keyof typeof Flags]
  return <Flag className={cn('size-4', className)} />
}