'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@repo/ui/components/ui/drawer'
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react'
import { getClerkErrorMessage, getPasswordStrength } from './security-utils'
import { isClerkRuntimeError, isReverificationCancelledError } from '@clerk/nextjs/errors'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import type { UserResource } from '@clerk/types'
import { toast } from '@repo/ui/components/ui/sonner'
import { useIsMobile } from '@repo/ui/hooks/use-mobile'
import { useReverification } from '@clerk/nextjs'
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'

interface PasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserResource
  mode: 'change' | 'set'
}

export function PasswordModal({ open, onOpenChange, user, mode }: PasswordModalProps) {
  const isMobile = useIsMobile()
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState({ new: false, confirm: false })
  const [errors, setErrors] = useState<{ new?: string; confirm?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const changeWithReverify = useReverification(
    (newPwd: string) =>
      user.updatePassword({ newPassword: newPwd }),
  )

  const setWithReverify = useReverification(
    (newPwd: string) =>
      user.updatePassword({ newPassword: newPwd }).then(() => user.reload()),
  )

  useEffect(() => {
    if (!open) {
      setNewPassword('')
      setConfirmPassword('')
      setErrors({})
      setSubmitError(null)
    }
  }, [open])

  const strength = getPasswordStrength(newPassword)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const next: typeof errors = {}
    if (!newPassword.trim()) next.new = 'New password is required'
    else if (newPassword.length < 8) next.new = 'Password must be at least 8 characters'
    if (newPassword !== confirmPassword) next.confirm = 'Passwords do not match'
    if (Object.keys(next).length > 0) {
      setErrors(next)
      return
    }
    setErrors({})
    startTransition(async () => {
      try {
        if (mode === 'change') {
          await changeWithReverify(newPassword)
          playSound('success')
          toast.success('Password updated successfully')
        } else {
          const result = await setWithReverify(newPassword)
          console.log('result', result)
          playSound('success')
          toast.success('Password set successfully')
        }
        setNewPassword('')
        setConfirmPassword('')
        setSubmitError(null)
        onOpenChange(false)
      } catch (err) {
        if (isClerkRuntimeError(err) && isReverificationCancelledError(err)) {
          toast.info('Verification was cancelled')
          return
        }
        const msg = getClerkErrorMessage(err)
        setSubmitError(msg)
        toast.error(msg)
      }
    })
  }

  const isChange = mode === 'change'
  const title = isChange ? 'Change password' : 'Set password'
  const description = isChange
    ? 'Enter your current password and choose a new one.'
    : 'Create a password for your account. You can use it to sign in with email and password.'

  const formBody = (
    <>
      {submitError && (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}
      <div className="space-y-2">
        <Label>{isChange ? 'New password' : 'New password'}</Label>
        <div className="relative">
          <Input
            type={show.new ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setErrors((p) => ({ ...p, new: undefined }))
            }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, new: !s.new }))}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {show.new ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
          </button>
        </div>
        {strength && (
          <p className="text-xs text-muted-foreground">
            Strength: <span className="font-medium">{strength}</span>
          </p>
        )}
        {errors.new && <p className="text-sm text-destructive">{errors.new}</p>}
      </div>
      <div className="space-y-2">
        <Label>{isChange ? 'Confirm new password' : 'Confirm password'}</Label>
        <div className="relative">
          <Input
            type={show.confirm ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setErrors((p) => ({ ...p, confirm: undefined }))
            }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {show.confirm ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
          </button>
        </div>
        {errors.confirm && <p className="text-sm text-destructive">{errors.confirm}</p>}
      </div>
    </>
  )

  const body = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formBody}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <IconLoader2 className="mr-2 size-4 animate-spin" />}
          {isChange ? 'Update password' : 'Set password'}
        </Button>
      </div>
    </form>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-4">{body}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
