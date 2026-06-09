'use client'

import { CountryFlag } from '@/shared/ui/common/country-flag'
import { countryByIso } from '@/shared/lib/country-by-iso'
import { IconEdit } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { FieldError } from '@ws/ui/components/ui/field'
import { Input } from '@ws/ui/components/ui/input'
import type { useUser } from '@clerk/nextjs'
import { resolveActionErrorMessage } from '@/shared/lib/i18n/resolve-action-error-message'
import { toast } from '@ws/ui/components/ui/sonner'
import { useLocale, useTranslations } from 'next-intl'
import { useHotkeys } from 'react-hotkeys-hook'
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { ComboboxCountry } from '@/shared/ui/common/combobox-country'
import {
  sanitizePlainText,
  validateOptionalProfileName,
  validateProfileName,
} from '@/shared/lib/sanitize-plain-text'
import { ProfileAvatar } from './profile-avatar'
import { resolveProfileNameErrorMessage } from './profile-field-errors'
import { ProfileSectionSaveActions } from './profile-section-save-actions'
import { useProfileSectionSave } from './use-profile-section-save'

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
  const locale = useLocale()
  const { play: playSound } = useSoundWithSettings()
  const { isPending, isDone, runSave } = useProfileSectionSave()
  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [country, setCountry] = useState(userStore?.country ?? '')
  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastNameError, setLastNameError] = useState<string | null>(null)

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
      setFirstNameError(null)
      setLastNameError(null)
      setIsEditing(false)
    },
    { enabled: isEditing }
  )

  const displayName = [firstName, lastName].filter(Boolean).join(' ')

  const handleCancel = () => {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setCountry(userStore?.country ?? '')
    setFirstNameError(null)
    setLastNameError(null)
    setIsEditing(false)
  }

  const handleSave = () => {
    const nextFirstNameError = resolveProfileNameErrorMessage(tp, validateProfileName(firstName))
    const nextLastNameError = resolveProfileNameErrorMessage(tp, validateOptionalProfileName(lastName))

    setFirstNameError(nextFirstNameError)
    setLastNameError(nextLastNameError)
    if (nextFirstNameError || nextLastNameError) {
      return
    }

    const safeFirstName = sanitizePlainText(firstName)
    const safeLastName = sanitizePlainText(lastName)

    runSave(async () => {
      try {
        await Promise.all([
          user.update({ firstName: safeFirstName, lastName: safeLastName }),
          updateUserCountry(country),
        ])
        playSound('success')
        toast.success(t('profileUpdated'))
        return true
      } catch (error: unknown) {
        toast.error(resolveActionErrorMessage(error, tRoot, 'user.updateFailed'))
        return false
      }
    }, () => setIsEditing(false))
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
              <div className="space-y-1">
                <Input
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (firstNameError) setFirstNameError(null)
                  }}
                  className="min-w-0"
                  placeholder={tp('firstNamePlaceholder')}
                  aria-label={tp('firstNameAria')}
                  aria-invalid={Boolean(firstNameError)}
                  required
                />
                <FieldError errors={firstNameError ? [{ message: firstNameError }] : undefined} />
              </div>
              <div className="space-y-1">
                <Input
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (lastNameError) setLastNameError(null)
                  }}
                  className="min-w-0"
                  placeholder={tp('lastNamePlaceholder')}
                  aria-label={tp('lastNameAria')}
                  aria-invalid={Boolean(lastNameError)}
                />
                <FieldError errors={lastNameError ? [{ message: lastNameError }] : undefined} />
              </div>
              <ComboboxCountry
                country={country}
                setCountry={setCountry}
                triggerClassName="sm:w-56"
              />
            </div>
            <ProfileSectionSaveActions
              cancelName="cancel-profile-header"
              saveName="save-profile-header"
              isPending={isPending}
              isDone={isDone}
              onCancel={handleCancel}
              onSave={handleSave}
            />
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
