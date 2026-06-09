'use client'

import { CountryFlag } from '@/shared/ui/common/country-flag'
import { countryByIso } from '@/shared/lib/country-by-iso'
import { IconEdit, IconLoader2 } from '@tabler/icons-react'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { Input } from '@ws/ui/components/ui/input'
import type { useUser } from '@clerk/nextjs'
import { resolveActionErrorMessage } from '@/shared/lib/i18n/resolve-action-error-message'
import { toast } from '@ws/ui/components/ui/sonner'
import { useLocale, useTranslations } from 'next-intl'
import { useHotkeys } from 'react-hotkeys-hook'
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { ComboboxCountry } from '@/shared/ui/common/combobox-country'
import { ProfileAvatar } from './profile-avatar'

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>

interface ProfileHeaderSectionProps {
  user: ClerkUser
  userStore: { country: string | null } | null
  updateUserCountry: (country: string) => Promise<unknown>
}

export function ProfileHeaderSection({
  user,
  userStore,
  updateUserCountry,
}: ProfileHeaderSectionProps) {
  const t = useTranslations('user')
  const tRoot = useTranslations()
  const tp = useTranslations('user.profile')
  const tc = useTranslations('common')
  const locale = useLocale()
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [country, setCountry] = useState(userStore?.country ?? '')

  useEffect(() => {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setCountry(userStore?.country ?? '')
  }, [user, userStore])

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
        toast.error(resolveActionErrorMessage(error, tRoot, 'user.updateFailed'))
      }
    })
  }

  return (
    <section
      data-section="profile-header"
      aria-label={tp('profileIdentityAria')}
      className="group/profile-header relative flex flex-col items-center gap-6 border-b border-input bg-muted/20 px-4 py-8 sm:flex-row sm:items-start sm:gap-8 sm:px-6 sm:py-10"
    >
      <ProfileAvatar user={user} />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:gap-4 sm:text-left">
        {isEditing ? (
          <div className="w-full space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="min-w-0"
                placeholder={tp('firstNamePlaceholder')}
                aria-label={tp('firstNameAria')}
              />
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="min-w-0"
                placeholder={tp('lastNamePlaceholder')}
                aria-label={tp('lastNameAria')}
              />
              <ComboboxCountry
                country={country}
                setCountry={setCountry}
                triggerClassName="sm:w-56"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button name="cancel-profile-header" size="sm" variant="ghost" onClick={handleCancel}>
                {tc('cancel')}
              </Button>
              <Button name="save-profile-header" size="sm" onClick={handleSave} disabled={isPending}>
                {isPending && (
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                )}
                {tc('save')}
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
                {countryByIso(country, locale)?.country ?? tp('notProvided')}
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
      {!isEditing && (
        <Button
          name="edit-profile-header"
          type="button"
          size="sm"
          variant="ghost"
          className="absolute right-4 top-4 gap-1 text-muted-foreground sm:right-6 sm:top-6 sm:opacity-0 sm:transition-opacity sm:group-hover/profile-header:opacity-100"
          onClick={() => setIsEditing(true)}
        >
          <IconEdit className="size-4" />
          {tp('edit')}
        </Button>
      )}
    </section>
  )
}
