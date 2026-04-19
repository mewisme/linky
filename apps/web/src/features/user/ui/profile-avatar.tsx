'use client'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@ws/ui/components/ui/avatar'

import { IconCamera } from '@tabler/icons-react'
import type { useUser } from '@clerk/nextjs'
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { useRef, useState } from 'react'

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>

interface ProfileAvatarProps {
  user: ClerkUser
}

export function ProfileAvatar({ user }: ProfileAvatarProps) {
  const t = useTranslations("user");
  const tp = useTranslations("user.profile");
  const { play: playSound } = useSoundWithSettings()
  const [isPending, setIsPending] = useState(false)
  const revealAfterLoadRef = useRef(false)

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsPending(true)
    revealAfterLoadRef.current = false
    try {
      await user.setProfileImage({ file })
      revealAfterLoadRef.current = true
      playSound('success')
      toast.success(t('avatarUpdated'))
    } catch (error: unknown) {
      revealAfterLoadRef.current = false
      setIsPending(false)
      toast.error(error instanceof Error ? error.message : t('uploadFailed'))
    }
  }

  const handleAvatarImageLoad = () => {
    if (!revealAfterLoadRef.current) return
    revealAfterLoadRef.current = false
    setIsPending(false)
  }

  const handleAvatarImageError = () => {
    if (!revealAfterLoadRef.current) return
    revealAfterLoadRef.current = false
    setIsPending(false)
  }

  return (
    <div className="relative group shrink-0">
      <Avatar className="size-24 ring-2 ring-border/60 shadow-md sm:size-32 sm:ring-[3px] sm:ring-border/40">
        <AvatarImage
          src={user.imageUrl}
          alt={[user.firstName, user.lastName].filter(Boolean).join(' ') || tp('profilePhotoAlt')}
          onLoad={handleAvatarImageLoad}
          onError={handleAvatarImageError}
        />
        <AvatarFallback className="text-xl font-semibold sm:text-2xl">
          {user.firstName?.charAt(0) ?? user.emailAddresses?.[0]?.emailAddress?.charAt(0) ?? '?'}
        </AvatarFallback>
      </Avatar>

      <label
        htmlFor="avatar-upload"
        className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200 hover:opacity-100 focus-within:opacity-100 cursor-pointer group-hover:opacity-100"
      >
        <IconCamera className="size-5 sm:size-6 mb-0.5 sm:mb-1" aria-hidden />
        <span className="text-[10px] font-medium sm:text-xs">{tp("changePhoto")}</span>
      </label>

      <input
        id="avatar-upload"
        type="file"
        className="sr-only"
        accept="image/*"
        onChange={handleImageChange}
        disabled={isPending}
        aria-label={tp("uploadPhotoAria")}
      />
    </div>
  )
}
