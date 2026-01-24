'use client'

import { IconCalendar, IconCheck, IconLoader2, IconPencil, IconUser, IconX } from '@tabler/icons-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@repo/ui/components/ui/button'
import { DatePicker } from '@/components/common/date-picker'
import type { UserDetails } from '@/stores/user-store'
import { toast } from "@repo/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'

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

  // Helper function to parse date string safely (avoid timezone issues)
  const parseDateString = (dateString: string): Date => {
    // Parse YYYY-MM-DD format and create date in local timezone
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year ?? 0, (month ?? 0) - 1, day ?? 0)
  }

  // Helper function to format date to YYYY-MM-DD string
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
        <IconUser className="size-4" />
        <span>Personal Information</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Date of Birth */}
        <div className="flex items-center gap-3 p-4 border rounded-xl bg-card group">
          <div className="p-2 bg-muted rounded-lg">
            <IconCalendar className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Date of Birth</p>
            {editingDateOfBirth ? (
              <div className="flex items-center gap-2 mt-1">
                <DatePicker
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUpdateDateOfBirth}
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
                    setDateOfBirth(
                      userDetails?.date_of_birth
                        ? parseDateString(userDetails.date_of_birth?.split('T')[0] ?? '')
                        : undefined
                    )
                    setEditingDateOfBirth(false)
                  }}
                >
                  <IconX className="size-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {userDetails?.date_of_birth
                    ? new Date(userDetails.date_of_birth).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )
                    : 'Not provided'}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="profile-section-edit-reveal"
                  onClick={() => setEditingDateOfBirth(true)}
                  aria-label="Edit date of birth"
                >
                  <IconPencil className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Gender */}
        <div className="flex items-center gap-3 p-4 border rounded-xl bg-card group">
          <div className="p-2 bg-muted rounded-lg">
            <IconUser className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Gender</p>
            {editingGender ? (
              <div className="flex items-center gap-2 mt-1">
                <Select
                  value={gender}
                  onValueChange={(value) => setGender(value || '')}
                >
                  <SelectTrigger className="flex-1">
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUpdateGender}
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
                    setGender(userDetails?.gender ?? '')
                    setEditingGender(false)
                  }}
                >
                  <IconX className="size-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground capitalize">
                  {userDetails?.gender
                    ? genderOptions.find((g) => g.value === userDetails.gender)
                      ?.label || userDetails.gender
                    : 'Not provided'}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="profile-section-edit-reveal"
                  onClick={() => setEditingGender(true)}
                  aria-label="Edit gender"
                >
                  <IconPencil className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
