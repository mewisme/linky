'use client'

import { IconCalendar, IconEdit, IconLoader2, IconUser } from '@tabler/icons-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ws/ui/components/ui/select'
import { useEffect, useMemo, useState, useTransition } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { DatePicker } from '@/shared/ui/common/date-picker'
import type { UserDetails } from '@/entities/user/model/user-store'
import { toast } from "@ws/ui/components/ui/sonner";
import { useLocale, useTranslations } from "next-intl";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'

interface PersonalInfoSectionProps {
  userDetails: UserDetails | null
  updateUserDetails: (data: {
    date_of_birth?: string | null
    gender?: string | null
  }) => Promise<UserDetails>
}

export function PersonalInfoSection({
  userDetails,
  updateUserDetails,
}: PersonalInfoSectionProps) {
  const t = useTranslations("user");
  const tp = useTranslations("user.profile");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [gender, setGender] = useState('')

  const genderOptions = useMemo(
    () => [
      { value: 'male', label: tp('genderMale') },
      { value: 'female', label: tp('genderFemale') },
      { value: 'other', label: tp('genderOther') },
      { value: 'prefer_not_to_say', label: tp('genderPreferNotToSay') },
    ],
    [tp],
  )

  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year ?? 0, (month ?? 0) - 1, day ?? 0)
  }

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    setDateOfBirth(
      userDetails?.date_of_birth
        ? parseDateString(userDetails.date_of_birth?.split('T')[0] ?? '')
        : undefined
    )
    setGender(userDetails?.gender || '')
  }, [userDetails])

  const handleStartEdit = () => {
    setDateOfBirth(
      userDetails?.date_of_birth
        ? parseDateString(userDetails.date_of_birth?.split('T')[0] ?? '')
        : undefined
    )
    setGender(userDetails?.gender || '')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setDateOfBirth(
      userDetails?.date_of_birth
        ? parseDateString(userDetails.date_of_birth?.split('T')[0] ?? '')
        : undefined
    )
    setGender(userDetails?.gender || '')
    setIsEditing(false)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        const dateString = dateOfBirth ? formatDateString(dateOfBirth) : null
        await updateUserDetails({
          date_of_birth: dateString,
          gender: gender || null,
        })
        playSound('success')
        toast.success(t('personalInfoUpdated'))
        setIsEditing(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : t('updateFailed'))
      }
    })
  }

  return (
    <div className="group/personal space-y-3 rounded-xl transition-colors hover:bg-muted/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IconUser className="size-4 shrink-0" aria-hidden />
          <span>{tp("personalInfo")}</span>
        </div>
        {!isEditing && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover/personal:opacity-100"
            onClick={handleStartEdit}
          >
            <IconEdit className="size-4" />
            {tp("edit")}
          </Button>
        )}
      </div>
      <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-56 flex-1">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <IconCalendar className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{tp("dateOfBirth")}</p>
                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <DatePicker
                      value={dateOfBirth}
                      onChange={setDateOfBirth}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-foreground">
                    {userDetails?.date_of_birth
                      ? new Date(userDetails.date_of_birth).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                      : tp('notProvided')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-56 flex-1">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <IconUser className="size-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{tp("genderLabel")}</p>
                {isEditing ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={gender}
                      onValueChange={(value) => setGender(value || '')}
                    >
                      <SelectTrigger className="w-48 min-w-0">
                        <SelectValue placeholder={tp("selectGender")} />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm capitalize text-foreground">
                    {userDetails?.gender
                      ? genderOptions.find((g) => g.value === userDetails.gender)?.label ||
                      userDetails.gender
                      : tp('notProvided')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {isEditing && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={handleCancel}>
            {tc("cancel")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending && (
              <IconLoader2 className="mr-2 size-4 animate-spin" />
            )}
            {tc("save")}
          </Button>
        </div>
      )}
    </div>
  )
}
