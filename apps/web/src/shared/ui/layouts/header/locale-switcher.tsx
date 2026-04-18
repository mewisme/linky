"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ws/ui/components/ui/dropdown-menu"
import { CountryFlag } from "@/shared/ui/common/country-flag"

import { Button } from "@ws/ui/components/ui/button"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { useLocalePreferenceStore } from "@/shared/model/locale-preference-store"
import type { UiLocale } from "@ws/shared-types"
import { useLocale, useTranslations } from "next-intl"

export function LocaleSwitcher() {
  const t = useTranslations("common")
  const locale = useLocale() as UiLocale
  const router = useRouter()
  const pathname = usePathname()
  const setLocalePreference = useLocalePreferenceStore((s) => s.setLocale)

  function switchLocale(next: UiLocale) {
    if (next === locale) return
    setLocalePreference(next)
    router.replace(pathname, { locale: next })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("language")}>
          <CountryFlag countryCode={locale === "en" ? "US" : "VN"} />
        </Button>
      </DropdownMenuTrigger>
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
