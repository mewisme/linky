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
} from '@repo/ui/components/kibo-ui/combobox'
import { CountryFlag, countries } from '@/components/common/country-flag'
import { IconCheck, IconChevronDown, IconLoader2, IconPencil, IconX } from '@tabler/icons-react'
import React, { useTransition } from 'react'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import type { UserResource } from '@clerk/types'
import toast from 'react-hot-toast'

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
  const [isPending, startTransition] = useTransition()
  const [editingName, setEditingName] = React.useState(false)
  const [editingCountry, setEditingCountry] = React.useState(false)
  const [firstName, setFirstName] = React.useState(user.firstName ?? '')
  const [lastName, setLastName] = React.useState(user.lastName ?? '')
  const [country, setCountry] = React.useState(userStore?.country ?? '')

  const countriesData = countries
    .filter((c) => c.length === 2)
    .map((c) => ({ label: c, value: c }))

  React.useEffect(() => {
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setCountry(userStore?.country ?? '')
  }, [user, userStore])

  const handleUpdateName = () => {
    startTransition(async () => {
      try {
        await user.update({ firstName, lastName })
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
        toast.success('Country updated')
        setEditingCountry(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  return (
    <div className="flex-1 w-full">
      <div>
        {/* Name (First Name + Last Name) */}
        {displayName && (
          <div className="flex items-center gap-2">
            {editingName ? (
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 flex gap-2">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="flex-1"
                    placeholder="First name"
                  />
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="flex-1"
                    placeholder="Last name"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUpdateName}
                  disabled={isPending}
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
                >
                  <IconX className="size-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2 group">
                <p className="text-lg font-semibold">{displayName}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setEditingName(true)}
                >
                  <IconPencil className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Country */}
        <div className="flex items-center gap-2">
          {editingCountry ? (
            <div className="flex-1 flex items-center gap-2">
              <Combobox
                data={countriesData}
                value={country}
                onValueChange={setCountry}
                type="country"
              >
                <ComboboxTrigger className="flex-1 justify-between">
                  <CountryFlag
                    countryCode={country}
                    className="size-4 mr-2"
                  />
                  <span className="text-sm font-medium">
                    {country || 'Select country'}
                  </span>
                  <IconChevronDown className="size-4 ml-2" />
                </ComboboxTrigger>

                <ComboboxContent>
                  <ComboboxInput />
                  <ComboboxEmpty />
                  <ComboboxList>
                    <ComboboxGroup>
                      {countriesData.map((c) => (
                        <ComboboxItem
                          key={c.value}
                          value={c.value}
                        >
                          <CountryFlag
                            countryCode={c.value}
                            className="size-4 mr-2"
                          />
                          <span className="text-sm font-medium">
                            {c.label}
                          </span>
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleUpdateCountry}
                disabled={isPending}
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
              >
                <IconX className="size-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 group">
              <CountryFlag countryCode={country} className="size-6" />
              <p className="text-sm text-muted-foreground">
                {country || 'Not provided'}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditingCountry(true)}
              >
                <IconPencil className="size-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Email */}
        <p className="text-sm text-muted-foreground">
          {user.primaryEmailAddress?.emailAddress}
        </p>
      </div>
    </div>
  )
}
