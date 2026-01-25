'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@repo/ui/components/ui/drawer'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@repo/ui/components/ui/input-otp"
import { buildTotpUri, getClerkErrorMessage } from './security-utils'
import { isClerkRuntimeError, isReverificationCancelledError } from '@clerk/nextjs/errors'
import { useEffect, useState } from 'react'

import { Button } from '@repo/ui/components/ui/button'
import { IconLoader2 } from '@tabler/icons-react'
import { Label } from '@repo/ui/components/ui/label'
import { REGEXP_ONLY_DIGITS } from "@repo/ui/internal-lib/input-otp"
import { Security2FaQr } from './security-2fa-qr'
import { Security2FaSecret } from './security-2fa-secret'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import type { UserResource } from '@clerk/types'
import { toast } from '@repo/ui/components/ui/sonner'
import { useIsMobile } from '@repo/ui/hooks/use-mobile'
import { useReverification } from '@clerk/nextjs'

type ViewMode = 'secret' | 'qr'

interface Security2FaSetupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserResource
  onSuccess: () => void
  createTOTPWithReverify: () => Promise<{ secret?: string } | undefined>
}

export function Security2FaSetup({
  open,
  onOpenChange,
  user,
  onSuccess,
  createTOTPWithReverify,
}: Security2FaSetupProps) {
  const isMobile = useIsMobile()
  const [viewMode, setViewMode] = useState<ViewMode>('qr')
  const [secret, setSecret] = useState<string | null>(null)
  const [totpCreating, setTotpCreating] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [totpVerifying, setTotpVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const verifyWithReverify = useReverification((code: string) =>
    user.verifyTOTP({ code }).then(() => user.reload())
  )

  const account = user.primaryEmailAddress?.emailAddress ?? user.id
  const otpauthUri = secret ? buildTotpUri(account, secret) : null

  useEffect(() => {
    if (!open || !user) return
    setSecret(null)
    setTotpCode('')
    setVerifyError(null)
    setViewMode('qr')
    setTotpCreating(true)
    createTOTPWithReverify()
      .then((t) => {
        setSecret((t as { secret?: string })?.secret ?? null)
      })
      .catch((err) => {
        if (isClerkRuntimeError(err) && isReverificationCancelledError(err)) {
          toast.info('Verification was cancelled')
        } else {
          toast.error(getClerkErrorMessage(err))
        }
        onOpenChange(false)
      })
      .finally(() => setTotpCreating(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit createTOTPWithReverify to avoid re-running when the callback reference changes
  }, [open, user, onOpenChange])

  const handleVerify = async () => {
    const code = totpCode.trim()
    if (!code || code.length !== 6) return
    setVerifyError(null)
    setTotpVerifying(true)
    try {
      await verifyWithReverify(code)
      onSuccess()
      onOpenChange(false)
      toast.success('Two-factor authentication enabled')
    } catch (err) {
      if (isClerkRuntimeError(err) && isReverificationCancelledError(err)) {
        toast.info('Verification was cancelled')
        return
      }
      const msg = getClerkErrorMessage(err)
      setVerifyError(msg)
      toast.error(msg)
    } finally {
      setTotpVerifying(false)
    }
  }

  const title = 'Enable two-factor authentication'
  const description =
    'Add the key to your authenticator app using the QR code or secret below, then enter the 6-digit code to verify.'

  const body = (
    <div className="space-y-4">
      {totpCreating ? (
        <Skeleton className="h-40 w-full" />
      ) : secret ? (
        <>
          <div className="space-y-2 flex justify-center w-full items-center flex-col">
            <Label htmlFor="totp-code">Verification code</Label>
            <InputOTP
              id="totp-code"
              value={totpCode}
              onChange={(value) => {
                setTotpCode(value)
                setVerifyError(null)
              }}
              pattern={REGEXP_ONLY_DIGITS}
              aria-invalid={!!verifyError}
              aria-describedby={verifyError ? 'totp-code-error' : undefined}
              maxLength={6}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {verifyError && (
              <p id="totp-code-error" className="text-sm text-destructive" role="alert">
                {verifyError}
              </p>
            )}
          </div>
          {viewMode === 'qr' ? (
            <Security2FaQr
              otpauthUri={otpauthUri!}
              onSwitchToSecret={() => setViewMode('secret')}
            />
          ) : (
            <Security2FaSecret secret={secret} onSwitchToQr={() => setViewMode('qr')} />
          )}

        </>
      ) : null}
    </div>
  )

  const footer = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button
        onClick={handleVerify}
        disabled={!secret || totpCode.length !== 6 || totpVerifying}
      >
        {totpVerifying && <IconLoader2 className="mr-2 size-4 animate-spin" />}
        Verify and enable
      </Button>
    </>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">{body}</div>
          <DrawerFooter>{footer}</DrawerFooter>
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
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
