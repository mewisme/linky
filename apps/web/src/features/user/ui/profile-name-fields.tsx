'use client'

import {
  CountryFlag
} from '@/shared/ui/common/country-flag'
import { countryByIso } from '@/shared/lib/country-by-iso'
import { IconLoader2 } from '@tabler/icons-react'
import React, { useTransition } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { Input } from '@ws/ui/components/ui/input'
import type { useUser } from '@clerk/nextjs'
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useHotkeys } from 'react-hotkeys-hook'
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { ComboboxCountry } from '@/shared/ui/common/combobox-country'

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>

interface ProfileNameFieldsProps {
  user: ClerkUser
  userStore: { country: string | null } | null
  updateUserCountry: (country: string) => Promise<unknown>
  startEditingSignal: number
  onEditingChange?: (isEditing: boolean) => void
}

export function ProfileNameFields({
  user,
  userStore,
  updateUserCountry,
  startEditingSignal,
  onEditingChange,
}: ProfileNameFieldsProps) {
  const t = useTranslations("user");
  const tp = useTranslations("user.profile");
  const tc = useTranslations("common");
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = React.useState(false)
  const [firstName, setFirstName] = React.useState(user.firstName ?? '')
  const [lastName, setLastName] = React.useState(user.lastName ?? '')
  const [country, setCountry] = React.useState(userStore?.country ?? '')

  React.useEffect(() => {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setCountry(userStore?.country ?? '')
  }, [user, userStore])

  React.useEffect(() => {
    if (startEditingSignal === 0) return
    setIsEditing(true)
  }, [startEditingSignal])

  React.useEffect(() => {
    onEditingChange?.(isEditing)
  }, [isEditing, onEditingChange])

  useHotkeys(
    'escape',
    () => {
      setFirstName(user.firstName ?? '')
      setLastName(user.lastName ?? '')
      setCountry(userStore?.country ?? '')
      setIsEditing(false)
    },
    { enabled: isEditing }
  )

  const displayName = [firstName, lastName].filter(Boolean).join(' ')

  const handleCancel = () => {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setCountry(userStore?.country ?? '')
    setIsEditing(false)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        await Promise.all([
          user.update({ firstName, lastName }),
          updateUserCountry(country),
        ])
        playSound('success')
        toast.success(t('profileUpdated'))
        setIsEditing(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : t('updateFailed'))
      }
    })
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:gap-4 sm:text-left">
      {isEditing ? (
        <div className="w-full space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="min-w-0"
              placeholder={tp("firstNamePlaceholder")}
              aria-label={tp("firstNameAria")}
            />
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="min-w-0"
              placeholder={tp("lastNamePlaceholder")}
              aria-label={tp("lastNameAria")}
            />
            <ComboboxCountry
              country={country}
              setCountry={setCountry}
              triggerClassName="sm:w-56"
            />
          </div>
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
        </div>
      ) : (
        <div className="w-full">
          {displayName && (
            <p className="text-lg font-semibold tracking-tight sm:text-xl">
              {displayName}
            </p>
          )}
          <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
            <CountryFlag countryCode={country} className="size-5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {countryByIso(country)?.country ?? tp('notProvided')}
            </p>
          </div>
        </div>
      )}

      {user.primaryEmailAddress?.emailAddress && (
        <p className="text-xs text-muted-foreground sm:text-sm">
          {user.primaryEmailAddress.emailAddress}
        </p>
      )}
    </div>
  )
}
