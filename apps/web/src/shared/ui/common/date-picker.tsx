"use client"

import * as React from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ws/ui/components/animate-ui/components/radix/popover"

import { Button } from "@ws/ui/components/ui/button"
import { Calendar } from "@ws/ui/components/ui/calendar"
import { Input } from "@ws/ui/components/ui/input"
import { IconCalendar } from "@tabler/icons-react"
import { format, isValid, parse } from "@ws/ui/internal-lib/date-fns"
import { enUS, vi } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"

interface DatePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

const PARSE_FORMATS = ["P", "PP", "yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "d/M/yyyy", "M/d/yyyy"]

function parseTypedDate(text: string, dateFnsLocale: typeof enUS): Date | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined

  for (const fmt of PARSE_FORMATS) {
    const parsed = parse(trimmed, fmt, new Date(), { locale: dateFnsLocale })
    if (isValid(parsed)) return parsed
  }

  return undefined
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const t = useTranslations("common")
  const locale = useLocale()
  const dateFnsLocale = locale === "vi" ? vi : enUS
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const formatDate = React.useCallback(
    (date: Date) => format(date, "P", { locale: dateFnsLocale }),
    [dateFnsLocale],
  )

  const placeholder = React.useMemo(
    () => format(new Date(2000, 0, 15), "P", { locale: dateFnsLocale }),
    [dateFnsLocale],
  )

  React.useEffect(() => {
    setInputValue(value ? formatDate(value) : "")
  }, [value, formatDate])

  const commitInput = () => {
    const parsed = parseTypedDate(inputValue, dateFnsLocale)
    if (parsed) {
      onChange(parsed)
      return
    }

    if (inputValue.trim() === "") {
      onChange(undefined)
      return
    }

    setInputValue(value ? formatDate(value) : "")
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commitInput}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur()
          }
        }}
        placeholder={placeholder}
        className="w-36 min-w-0"
        aria-label={t("selectDate")}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label={t("selectDate")}
          >
            <IconCalendar className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            defaultMonth={value}
            captionLayout="dropdown"
            onSelect={(date) => {
              onChange(date)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
