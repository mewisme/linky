import * as lookup from 'country-code-lookup'

import { countries, CountryFlag } from './country-flag'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from '@ws/ui/components/kibo-ui/combobox'
import { IconChevronDown } from '@tabler/icons-react'
import { cn } from '@ws/ui/lib/utils'

export function ComboboxCountry({
  country,
  setCountry,
  triggerClassName,
}: {
  country: string
  setCountry: (country: string) => void
  triggerClassName?: string
}) {
  const countriesData = countries
    .filter((c) => c.length === 2)
    .map((c) => ({ label: lookup.byIso(c)?.country ?? c, value: c }))

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
          {lookup.byIso(country)?.country ?? 'Select country'}
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