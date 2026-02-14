'use client'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@ws/ui/components/kibo-ui/combobox'
import { CountryFlag, countries } from '@/components/common/country-flag'
import { FIELD_LABELS, useProfileEdit } from '@/components/context-menu/profile/profile-edit-context'
import { IconCheck, IconChevronDown, IconLoader2, IconX } from '@tabler/icons-react'
import React, { useTransition } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { Input } from '@ws/ui/components/ui/input'
import type { UserResource } from '@clerk/types'
import { toast } from "@ws/ui/components/ui/sonner";
import { useHotkeys } from 'react-hotkeys-hook'
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'

interface ProfileNameFieldsProps {
  user: UserResource
  userStore: { country: string | null } | null
  updateUserCountry: (country: string) => Promise<unknown>
}

export function ProfileNameFields({
  user,
  userStore,
  updateUserCountry,
}: ProfileNameFieldsProps) {
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [editingName, setEditingName] = React.useState(false)
  const [editingCountry, setEditingCountry] = React.useState(false)
  const [firstName, setFirstName] = React.useState(user.firstName ?? '')
  const [lastName, setLastName] = React.useState(user.lastName ?? '')
  const [country, setCountry] = React.useState(userStore?.country ?? '')

  const profileEdit = useProfileEdit()
  const profileEditRef = React.useRef(profileEdit)
  profileEditRef.current = profileEdit
  const countriesData = countries
    .filter((c) => c.length === 2)
    .map((c) => ({ label: c, value: c }))

  React.useEffect(() => {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setCountry(userStore?.country ?? '')
  }, [user, userStore])

  React.useEffect(() => {
    const ctx = profileEditRef.current
    if (!ctx) return
    ctx.register('name', FIELD_LABELS.name, () => setEditingName(true))
    ctx.register('country', FIELD_LABELS.country, () => setEditingCountry(true))
    return () => {
      profileEditRef.current?.unregister('name')
      profileEditRef.current?.unregister('country')
    }
  }, [])

  useHotkeys(
    'escape',
    () => {
      if (editingName) {
        setFirstName(user.firstName ?? '')
        setLastName(user.lastName ?? '')
        setEditingName(false)
      } else if (editingCountry) {
        setCountry(userStore?.country ?? '')
        setEditingCountry(false)
      }
    },
    { enabled: editingName || editingCountry }
  )

  const handleUpdateName = () => {
    startTransition(async () => {
      try {
        await user.update({ firstName, lastName })
        playSound('success')
        toast.success('Name updated')
        setEditingName(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ')

  const handleUpdateCountry = () => {
    startTransition(async () => {
      try {
        await updateUserCountry(country)
        playSound('success')
        toast.success('Country updated')
        setEditingCountry(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:gap-4 sm:text-left">
      {displayName && (
        <div className="w-full">
          {editingName ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex flex-1 gap-2 min-w-0">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="min-w-0 flex-1"
                  placeholder="First name"
                  aria-label="First name"
                />
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="min-w-0 flex-1"
                  placeholder="Last name"
                  aria-label="Last name"
                />
              </div>
              <div className="flex justify-end gap-1 sm:justify-start">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUpdateName}
                  disabled={isPending}
                  aria-label={isPending ? 'Saving' : 'Save name'}
                >
                  {isPending ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4 text-green-600" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFirstName(user.firstName ?? '')
                    setLastName(user.lastName ?? '')
                    setEditingName(false)
                  }}
                  aria-label="Cancel"
                >
                  <IconX className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-lg font-semibold tracking-tight sm:text-xl">
              {displayName}
            </p>
          )}
        </div>
      )}

      <div className="w-full">
        {editingCountry ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <Combobox
              data={countriesData}
              value={country}
              onValueChange={setCountry}
              type="country"
            >
              <ComboboxTrigger className="w-full justify-between sm:max-w-56">
                <CountryFlag countryCode={country} className="size-4 shrink-0" />
                <span className="truncate text-sm font-medium">
                  {country || 'Select country'}
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
            <div className="flex justify-end gap-1 sm:justify-start">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUpdateCountry}
                disabled={isPending}
                aria-label={isPending ? 'Saving' : 'Save country'}
              >
                {isPending ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconCheck className="size-4 text-green-600" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCountry(userStore?.country ?? '')
                  setEditingCountry(false)
                }}
                aria-label="Cancel"
              >
                <IconX className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <CountryFlag countryCode={country} className="size-5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {country || 'Not provided'}
            </p>
          </div>
        )}
      </div>

      {user.primaryEmailAddress?.emailAddress && (
        <p className="text-xs text-muted-foreground sm:text-sm">
          {user.primaryEmailAddress.emailAddress}
        </p>
      )}
    </div>
  )
}
