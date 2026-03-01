'use client'

import { IconInfoCircle, IconLoader2 } from '@tabler/icons-react'
import { useEffect, useRef, useState, useTransition } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { Textarea } from '@ws/ui/components/ui/textarea'
import type { UserDetails } from '@/entities/user/model/user-store'
import { toast } from "@ws/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { FIELD_LABELS, useProfileEdit } from '@/shared/ui/context-menu/profile/profile-edit-context'

const BIO_MAX_LENGTH = 300

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

  const profileEdit = useProfileEdit()
  const profileEditRef = useRef(profileEdit)
  profileEditRef.current = profileEdit
  useEffect(() => {
    const ctx = profileEditRef.current
    if (!ctx) return
    ctx.register('bio', FIELD_LABELS.bio, () => setEditingBio(true))
    return () => profileEditRef.current?.unregister('bio')
  }, [])

  const handleUpdateBio = () => {
    const value = bio.trim() || null
    startTransition(async () => {
      try {
        await updateUserDetails({ bio: value })
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
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <IconInfoCircle className="size-4 shrink-0" aria-hidden />
        <span>Bio</span>
      </div>
      {editingBio ? (
        <div className="space-y-3">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
            placeholder="Tell us about yourself..."
            className="min-h-[100px] w-full resize-y rounded-lg"
            maxLength={BIO_MAX_LENGTH}
            aria-label="Bio"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {bio.length}/{BIO_MAX_LENGTH}
            </p>
            <div className="flex gap-2">
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
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {userDetails?.bio || 'Not provided'}
          </p>
        </div>
      )}
    </div>
  )
}
