'use client'

import { IconEdit, IconInfoCircle, IconLoader2 } from '@tabler/icons-react'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { Textarea } from '@ws/ui/components/ui/textarea'
import type { UserDetails } from '@/entities/user/model/user-store'
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'

const BIO_MAX_LENGTH = 300

interface BioSectionProps {
  userDetails: UserDetails | null
  updateUserDetails: (data: { bio: string | null }) => Promise<UserDetails>
}

export function BioSection({
  userDetails,
  updateUserDetails,
}: BioSectionProps) {
  const t = useTranslations("user");
  const tp = useTranslations("user.profile");
  const tc = useTranslations("common");
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [editingBio, setEditingBio] = useState(false)
  const [bio, setBio] = useState('')

  useEffect(() => {
    setBio(userDetails?.bio ?? '')
  }, [userDetails])

  const handleUpdateBio = () => {
    const value = bio.trim() || null
    startTransition(async () => {
      try {
        await updateUserDetails({ bio: value })
        playSound('success')
        toast.success(t('bioUpdated'))
        setEditingBio(false)
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : t('updateFailed'))
      }
    })
  }

  return (
    <div className="group/bio min-w-0 space-y-2 rounded-xl transition-colors hover:bg-muted/10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IconInfoCircle className="size-4 shrink-0" aria-hidden />
          <span>{tp("bio")}</span>
        </div>
        {!editingBio && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover/bio:opacity-100"
            onClick={() => setEditingBio(true)}
          >
            <IconEdit className="size-4" />
            {tp("edit")}
          </Button>
        )}
      </div>
      {editingBio ? (
        <div className="space-y-3">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
            placeholder={tp("tellAboutYourself")}
            className="min-h-[100px] w-full resize-y rounded-lg"
            maxLength={BIO_MAX_LENGTH}
            aria-label={tp("bioAria")}
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
                {tc("cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateBio}
                disabled={isPending}
              >
                {isPending && (
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                )}
                {tc("save")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="w-full min-w-0 rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-left transition-colors hover:border-border sm:px-5 sm:py-4"
          onClick={() => setEditingBio(true)}
        >
          <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-muted-foreground">
            {userDetails?.bio || tp('notProvided')}
          </p>
        </button>
      )}
    </div>
  )
}
