'use client'

import { ShaderAvatar, AvatarFallback, AvatarImage } from '@ws/ui/components/mew-ui/shader'
import { IconCamera } from '@tabler/icons-react'
import type { useUser } from '@clerk/nextjs'
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'
import { fileTypeFromBlob } from 'file-type'
import { useRef, useState } from 'react'

async function hasImageMimeFromMagic(file: File): Promise<boolean> {
  const result = await fileTypeFromBlob(file)
  return result?.mime.startsWith('image/') ?? false
}

async function canDecodeAsImage(file: File): Promise<boolean> {
  try {
    const bitmap = await createImageBitmap(file)
    bitmap.close()
    return true
  } catch {
    return false
  }
}

async function isActualImageFile(file: File): Promise<boolean> {
  if (await hasImageMimeFromMagic(file)) return true
  return canDecodeAsImage(file)
}

async function toSquareAvatarFile(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    const w = bitmap.width
    const h = bitmap.height
    if (w === h) return file

    const side = h >= w ? w : h
    const canvas = document.createElement('canvas')
    canvas.width = side
    canvas.height = side
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not available.')

    ctx.drawImage(bitmap, 0, 0, side, side, 0, 0, side, side)

    const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result)
          else reject(new Error('Failed to encode image.'))
        },
        mimeType,
        mimeType === 'image/png' ? undefined : 0.92,
      )
    })

    const ext = mimeType === 'image/png' ? '.png' : '.jpg'
    const base = file.name.replace(/\.[^.]+$/, '') || 'avatar'
    return new File([blob], `${base}${ext}`, { type: mimeType })
  } finally {
    bitmap.close()
  }
}

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

    if (!(await isActualImageFile(file))) {
      toast.error(t('invalidImageFile'))
      e.target.value = ''
      return
    }

    setIsPending(true)
    revealAfterLoadRef.current = false
    try {
      const prepared = await toSquareAvatarFile(file)
      await user.setProfileImage({ file: prepared })
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
      <ShaderAvatar className="size-24 ring-2 ring-border/60 shadow-md sm:size-32 sm:ring-[3px] sm:ring-border/40">
        <AvatarImage
          src={user.imageUrl}
          alt={[user.firstName, user.lastName].filter(Boolean).join(' ') || tp('profilePhotoAlt')}
          onLoad={handleAvatarImageLoad}
          onError={handleAvatarImageError}
        />
        <AvatarFallback className="text-xl font-semibold sm:text-2xl">
          {user.firstName?.charAt(0) ?? user.emailAddresses?.[0]?.emailAddress?.charAt(0) ?? '?'}
        </AvatarFallback>
      </ShaderAvatar>

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
