'use client'

import { IconEdit, IconInfoCircle } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { Textarea } from '@ws/ui/components/ui/textarea'
import type { UserDetails } from '@/entities/user/model/user-store'
import { resolveActionErrorMessage } from '@/shared/lib/i18n/resolve-action-error-message'
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { ProfileSectionSaveActions } from './profile-section-save-actions'
import { useProfileSectionSave } from './use-profile-section-save'

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
  const tRoot = useTranslations();
  const tp = useTranslations("user.profile");
  const { play: playSound } = useSoundWithSettings()
  const { isPending, isDone, runSave } = useProfileSectionSave()
  const [editingBio, setEditingBio] = useState(false)
  const [bio, setBio] = useState('')

  useEffect(() => {
    setBio(userDetails?.bio ?? '')
  }, [userDetails])

  const handleUpdateBio = () => {
    const value = bio.trim() || null
    runSave(async () => {
      try {
        await updateUserDetails({ bio: value })
        playSound('success')
        toast.success(t('bioUpdated'))
        return true
      } catch (error: unknown) {
        toast.error(resolveActionErrorMessage(error, tRoot, 'user.updateFailed'))
        return false
      }
    }, () => setEditingBio(false))
  }

  return (
    <div data-section="bio" className="group/bio min-w-0 space-y-2 rounded-xl transition-colors hover:bg-muted/10 ">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <IconInfoCircle className="size-4 shrink-0" aria-hidden />
          <span>{tp("bio")}</span>
        </div>
        {!editingBio && (
          <Button
            name="edit-bio"
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
            className="min-h-[100px] w-full resize-y"
            maxLength={BIO_MAX_LENGTH}
            aria-label={tp("bioAria")}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {bio.length}/{BIO_MAX_LENGTH}
            </p>
            <ProfileSectionSaveActions
              cancelName="cancel-bio"
              saveName="save-bio"
              isPending={isPending}
              isDone={isDone}
              onCancel={() => {
                setBio(userDetails?.bio ?? '')
                setEditingBio(false)
              }}
              onSave={handleUpdateBio}
              className="flex gap-2"
            />
          </div>
        </div>
      ) : (
        <div className="w-full min-w-0 rounded-xl border border-input bg-muted/30 px-4 py-3 sm:px-5 sm:py-4">
          <p className="whitespace-pre-wrap wrap-break-word text-sm leading-relaxed text-muted-foreground">
            {userDetails?.bio || tp('notProvided')}
          </p>
        </div>
      )}
    </div>
  )
}
