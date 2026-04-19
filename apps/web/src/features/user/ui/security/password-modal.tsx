'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ws/ui/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@ws/ui/components/ui/drawer'
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react'
import { getClerkErrorMessage, getPasswordStrength } from './security-utils'
import { isClerkRuntimeError, isReverificationCancelledError } from '@clerk/nextjs/errors'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { Checkbox } from '@ws/ui/components/ui/checkbox'
import { Input } from '@ws/ui/components/ui/input'
import { Label } from '@ws/ui/components/ui/label'
import { useSession, type useUser } from '@clerk/nextjs'
import { toast } from '@ws/ui/components/ui/sonner'
import { useTranslations } from 'next-intl'
import { useIsMobile } from '@ws/ui/hooks/use-mobile'
import { useReverification } from '@clerk/nextjs'
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>

interface PasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ClerkUser
  mode: 'change' | 'set'
}

export function PasswordModal({ open, onOpenChange, user, mode }: PasswordModalProps) {
  const t = useTranslations('user')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const { session } = useSession()
  const isMobile = useIsMobile()
  const { play: playSound } = useSoundWithSettings()
  const [isPending, startTransition] = useTransition()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [show, setShow] = useState({ new: false, confirm: false })
  const [errors, setErrors] = useState<{ new?: string; confirm?: string }>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [signOutOtherDevices, setSignOutOtherDevices] = useState(false)

  const changeWithReverify = useReverification(
    (newPwd: string) =>
      user.updatePassword({ newPassword: newPwd })
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
      setSignOutOtherDevices(false)
    }
  }, [open])

  const strength = getPasswordStrength(newPassword)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    const next: typeof errors = {}
    if (!newPassword.trim()) next.new = t('passwordNewRequired')
    else if (newPassword.length < 8) next.new = t('passwordMinLength')
    if (newPassword !== confirmPassword) next.confirm = t('passwordsMismatch')
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
          toast.success(t('passwordUpdated'))
        } else {
          await setWithReverify(newPassword)
          playSound('success')
          toast.success(t('passwordSet'))
        }
        if (signOutOtherDevices && session?.id) {
          try {
            const sessions = await user.getSessions()
            await Promise.all(
              sessions
                .filter((s) => s.id !== session.id)
                .map((s) => s.revoke()),
            )
          } catch {
            toast.error(t('passwordOtherSessionsRevokeFailed'))
          }
        }
        setNewPassword('')
        setConfirmPassword('')
        setSubmitError(null)
        onOpenChange(false)
      } catch (err) {
        if (isClerkRuntimeError(err) && isReverificationCancelledError(err)) {
          toast.info(t('verificationCancelled'))
          return
        }
        const msg = getClerkErrorMessage(err, te('unexpected'))
        setSubmitError(msg)
        toast.error(msg)
      }
    })
  }

  const isChange = mode === 'change'
  const title = isChange ? t('passwordChangeTitle') : t('passwordSetTitle')
  const description = isChange
    ? t('passwordChangeDescription')
    : t('passwordSetDescription')

  const formBody = (
    <>
      {submitError && (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}
      <div className="space-y-2">
        <Label>{t('labelNewPassword')}</Label>
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
            {t('passwordStrengthLabel')}{' '}
            <span className="font-medium">
              {strength === 'weak'
                ? t('passwordStrengthWeak')
                : strength === 'medium'
                  ? t('passwordStrengthMedium')
                  : t('passwordStrengthStrong')}
            </span>
          </p>
        )}
        {errors.new && <p className="text-sm text-destructive">{errors.new}</p>}
      </div>
      <div className="space-y-2">
        <Label>{isChange ? t('labelConfirmNewPassword') : t('labelConfirmPassword')}</Label>
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
      <div className="flex items-start gap-2 rounded-lg border p-3">
        <Checkbox
          id="password-sign-out-others"
          checked={signOutOtherDevices}
          onCheckedChange={(v) => setSignOutOtherDevices(v === true)}
          data-testid="security-password-sign-out-others"
        />
        <Label
          htmlFor="password-sign-out-others"
          className="cursor-pointer text-sm font-normal leading-snug text-muted-foreground"
        >
          {t('passwordLogoutOtherDevices')}
        </Label>
      </div>
    </>
  )

  const body = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formBody}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="dialog-cancel-button">
          {tc('cancel')}
        </Button>
        <Button type="submit" disabled={isPending} data-testid="security-password-submit">
          {isPending && <IconLoader2 className="mr-2 size-4 animate-spin" />}
          {isChange ? t('updatePassword') : t('setPassword')}
        </Button>
      </div>
    </form>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="sm:max-w-md" data-testid="drawer-container">
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
      <DialogContent className="sm:max-w-md" data-testid="dialog-container">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
