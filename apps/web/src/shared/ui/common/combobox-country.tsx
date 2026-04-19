'use client'

import { countryByIso } from '@/shared/lib/country-by-iso'

import { countries, CountryFlag } from './country-flag'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from '@ws/ui/components/kibo-ui/combobox'
import { IconChevronDown } from '@tabler/icons-react'
import { cn } from '@ws/ui/lib/utils'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'

export function ComboboxCountry({
  country,
  setCountry,
  triggerClassName,
}: {
  country: string
  setCountry: (country: string) => void
  triggerClassName?: string
}) {
  const t = useTranslations('common')
  const locale = useLocale()
  const countriesData = useMemo(
    () =>
      countries
        .filter((c) => c.length === 2)
        .map((c) => ({ label: countryByIso(c, locale)?.country ?? c, value: c })),
    [locale],
  )

  return (
    <Combobox
      data={countriesData}
      value={country}
      onValueChange={setCountry}
      type="country"
    >
      <ComboboxTrigger
        className={cn('w-full justify-between sm:w-48', triggerClassName)}
      >
        <CountryFlag countryCode={country} className="size-4 shrink-0" />
        <span className="truncate text-sm font-medium">
          {countryByIso(country, locale)?.country ?? t('selectCountry')}
        </span>
        <IconChevronDown className="size-4 shrink-0" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput />
        <ComboboxEmpty />
        <ComboboxList>
          <ComboboxGroup>
            {countriesData.map((c) => (
              <ComboboxItem key={c.value} value={c.value}>
                <CountryFlag countryCode={c.value} className="size-4 shrink-0" />
                <span className="text-sm font-medium">{c.label}</span>
              </ComboboxItem>
            ))}
          </ComboboxGroup>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}