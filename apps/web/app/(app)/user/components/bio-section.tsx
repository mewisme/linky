'use client'

import { IconInfoCircle, IconLoader2, IconPencil } from '@tabler/icons-react'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@repo/ui/components/ui/button'
import { Textarea } from '@repo/ui/components/ui/textarea'
import type { UserDetails } from '@/stores/user-store'
import { toast } from "@repo/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'

interface BioSectionProps {
  userDetails: UserDetails | null
  updateUserDetails: (data: { bio: string | null }) => Promise<UserDetails>
}

export function BioSection({
  userDetails,
  updateUserDetails,
}: BioSectionProps) {
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [editingBio, setEditingBio] = useState(false)
  const [bio, setBio] = useState('')

  useEffect(() => {
    setBio(userDetails?.bio ?? '')
  }, [userDetails])

  const handleUpdateBio = () => {
    startTransition(async () => {
      try {
        await updateUserDetails({ bio: bio || null })
        playSound('success')
        toast.success('Bio updated')
        setEditingBio(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Update failed')
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IconInfoCircle className="size-4" />
          <span>Bio</span>
        </div>
        {!editingBio && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingBio(true)}
          >
            <IconPencil className="size-4" />
          </Button>
        )}
      </div>
      {editingBio ? (
        <div className="space-y-2">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setBio(userDetails?.bio ?? '')
                setEditingBio(false)
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateBio}
              disabled={isPending}
            >
              {isPending && (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border rounded-xl bg-card">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {userDetails?.bio || 'Not provided'}
          </p>
        </div>
      )}
    </div>
  )
}
