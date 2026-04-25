"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ws/ui/components/ui/dropdown-menu"
import { Moon, Sun } from "@ws/ui/internal-lib/icons"

import { Button } from "@ws/ui/components/ui/button"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"

export function ModeToggle() {
  const t = useTranslations("common")
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">{t("toggleTheme")}</span>
        </Button>
      } />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {t("themeLight")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {t("themeDark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {t("themeSystem")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
