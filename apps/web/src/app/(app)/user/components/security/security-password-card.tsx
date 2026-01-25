'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { IconEye, IconEyeOff, IconLoader2, IconLock } from '@tabler/icons-react'
import { getClerkErrorMessage, getPasswordStrength } from './security-utils'
import { useState, useTransition } from 'react'

import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Label } from '@repo/ui/components/ui/label'
import type { UserResource } from '@clerk/types'
import { toast } from '@repo/ui/components/ui/sonner'
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'

interface SecurityPasswordCardProps {
  user: UserResource
}

export function SecurityPasswordCard({ user }: SecurityPasswordCardProps) {
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const strength = getPasswordStrength(newPassword)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const next: typeof errors = {}
    if (!currentPassword.trim()) next.current = 'Current password is required'
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
        await user.updatePassword({ currentPassword, newPassword })
        playSound('success')
        toast.success('Password updated successfully')
        setSubmitError(null)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } catch (err) {
        const msg = getClerkErrorMessage(err)
        setSubmitError(msg)
        toast.error(msg)
      }
    })
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <IconLock className="size-5" />
          <CardTitle>Password</CardTitle>
        </div>
        <CardDescription>Change your account password</CardDescription>
      </CardHeader>
      {user.passwordEnabled ? (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}
            <div className="space-y-2">
              <Label>Current password</Label>
              <div className="relative">
                <Input
                  type={show.current ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setErrors((p) => ({ ...p, current: undefined }))
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => ({ ...s, current: !s.current }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {show.current ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
                </button>
              </div>
              {errors.current && <p className="text-sm text-destructive">{errors.current}</p>}
            </div>
            <div className="space-y-2">
              <Label>New password</Label>
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
              <Label>Confirm new password</Label>
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
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your account does not use a password. You signed up using another authentication
            method.
          </p>
        </CardContent>
      )}
    </Card>
  )
}
