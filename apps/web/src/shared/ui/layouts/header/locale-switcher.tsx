"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ws/ui/components/ui/dropdown-menu"
import { CountryFlag } from "@/shared/ui/common/country-flag"

import { Button } from "@ws/ui/components/ui/button"
import { routing } from "@/i18n/routing"
import { useLocaleSwitch } from "@/shared/hooks/i18n/use-locale-switch"
import type { UiLocale } from "@ws/shared-types"
import { useLocale, useTranslations } from "next-intl"

export function LocaleSwitcher() {
  const t = useTranslations("common")
  const locale = useLocale() as UiLocale
  const { switchLocale } = useLocaleSwitch()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" size="icon" aria-label={t("language")}>
          <CountryFlag countryCode={locale === "en" ? "US" : "VN"} />
        </Button>
      } />
      <DropdownMenuContent className="w-fit">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
          >
            <CountryFlag countryCode={loc === "en" ? "US" : "VN"} />
            <span>{loc === "en" ? t("english") : t("vietnamese")}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
