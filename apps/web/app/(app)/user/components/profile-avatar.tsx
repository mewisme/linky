'use client'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/ui/avatar'
import { IconCamera } from '@tabler/icons-react'
import { useTransition } from 'react'
import type { UserResource } from '@clerk/types'
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'
import toast from 'react-hot-toast'

interface ProfileAvatarProps {
  user: UserResource
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
    <div className="relative group">
      <Avatar className="size-32 border-2 border-muted shadow-sm">
        <AvatarImage src={user.imageUrl} />
        <AvatarFallback className="text-2xl font-bold">
          {user.firstName?.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <label
        htmlFor="avatar-upload"
        className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-full transition-all"
      >
        <IconCamera className="size-6 mb-1" />
        <span className="text-[10px] font-bold">CHANGE</span>
      </label>

      <input
        id="avatar-upload"
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleImageChange}
        disabled={isPending}
      />
    </div>
  )
}
