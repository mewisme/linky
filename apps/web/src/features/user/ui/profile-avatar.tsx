'use client'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@ws/ui/components/ui/avatar'

import { IconCamera } from '@tabler/icons-react'
import type { useUser } from '@clerk/nextjs'
import { toast } from "@ws/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { useTransition } from 'react'

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>

interface ProfileAvatarProps {
  user: ClerkUser
}

export function ProfileAvatar({ user }: ProfileAvatarProps) {
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    startTransition(async () => {
      try {
        await user.setProfileImage({ file })
        playSound('success')
        toast.success('Avatar updated')
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Upload failed')
      }
    })
  }

  return (
    <div className="relative group shrink-0">
      <Avatar className="size-24 ring-2 ring-border/60 shadow-md sm:size-32 sm:ring-[3px] sm:ring-border/40">
        <AvatarImage
          src={user.imageUrl}
          alt={[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Profile'}
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
        <span className="text-[10px] font-medium sm:text-xs">Change</span>
      </label>

      <input
        id="avatar-upload"
        type="file"
        className="sr-only"
        accept="image/*"
        onChange={handleImageChange}
        disabled={isPending}
        aria-label="Upload new profile photo"
      />
    </div>
  )
}
