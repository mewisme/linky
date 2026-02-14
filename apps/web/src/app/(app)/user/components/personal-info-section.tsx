'use client'

import { IconCalendar, IconCheck, IconLoader2, IconUser, IconX } from '@tabler/icons-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ws/ui/components/ui/select'
import { useEffect, useRef, useState, useTransition } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { DatePicker } from '@/components/common/date-picker'
import type { UserDetails } from '@/stores/user-store'
import { toast } from "@ws/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'
import { FIELD_LABELS, useProfileEdit } from '@/components/context-menu/profile/profile-edit-context'

interface PersonalInfoSectionProps {
  userDetails: UserDetails | null
  updateUserDetails: (data: {
    date_of_birth?: string | null
    gender?: string | null
  }) => Promise<UserDetails>
}

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

export function PersonalInfoSection({
  userDetails,
  updateUserDetails,
}: PersonalInfoSectionProps) {
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [editingDateOfBirth, setEditingDateOfBirth] = useState(false)
  const [editingGender, setEditingGender] = useState(false)
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [gender, setGender] = useState('')

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
    if (!userDetails) return
    setDateOfBirth(
      userDetails.date_of_birth
        ? parseDateString(userDetails.date_of_birth?.split('T')[0] ?? '')
        : undefined
    )
    setGender(userDetails.gender || '')
  }, [userDetails])

  const profileEdit = useProfileEdit()
  const profileEditRef = useRef(profileEdit)
  profileEditRef.current = profileEdit
  useEffect(() => {
    const ctx = profileEditRef.current
    if (!ctx) return
    ctx.register('dateOfBirth', FIELD_LABELS.dateOfBirth, () => setEditingDateOfBirth(true))
    ctx.register('gender', FIELD_LABELS.gender, () => setEditingGender(true))
    return () => {
      profileEditRef.current?.unregister('dateOfBirth')
      profileEditRef.current?.unregister('gender')
    }
  }, [])

  const handleUpdateDateOfBirth = () => {
    startTransition(async () => {
      try {
        const dateString = dateOfBirth
          ? formatDateString(dateOfBirth)
          : null
        await updateUserDetails({ date_of_birth: dateString })
        playSound('success')
        toast.success('Date of birth updated')
        setEditingDateOfBirth(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  const handleUpdateGender = () => {
    startTransition(async () => {
      try {
        await updateUserDetails({ gender: gender || null })
        playSound('success')
        toast.success('Gender updated')
        setEditingGender(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <IconUser className="size-4 shrink-0" aria-hidden />
        <span>Personal Information</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-start">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <IconCalendar className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
            {editingDateOfBirth ? (
              <div className="flex flex-wrap items-center gap-2">
                <DatePicker
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleUpdateDateOfBirth}
                    disabled={isPending}
                    aria-label={isPending ? 'Saving' : 'Save'}
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
                      setDateOfBirth(
                        userDetails?.date_of_birth
                          ? parseDateString(userDetails.date_of_birth?.split('T')[0] ?? '')
                          : undefined
                      )
                      setEditingDateOfBirth(false)
                    }}
                    aria-label="Cancel"
                  >
                    <IconX className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground">
                {userDetails?.date_of_birth
                  ? new Date(userDetails.date_of_birth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Not provided'}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-start">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <IconUser className="size-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Gender</p>
            {editingGender ? (
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={gender}
                  onValueChange={(value) => setGender(value || '')}
                >
                  <SelectTrigger className="w-full min-w-0 sm:max-w-48">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleUpdateGender}
                    disabled={isPending}
                    aria-label={isPending ? 'Saving' : 'Save'}
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
                      setGender(userDetails?.gender ?? '')
                      setEditingGender(false)
                    }}
                    aria-label="Cancel"
                  >
                    <IconX className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm capitalize text-foreground">
                {userDetails?.gender
                  ? genderOptions.find((g) => g.value === userDetails.gender)?.label ||
                    userDetails.gender
                  : 'Not provided'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
