'use client'

import {
  AuthenticationCard,
  Security2FaCard,
  Security2FaSetup,
  SecuritySessionsCard,
  getClerkErrorMessage,
} from '../components/security'
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
import { isClerkRuntimeError, isReverificationCancelledError } from '@clerk/nextjs/errors'
import { useEffect, useState } from 'react'

import { AppLayout } from '@/components/layouts/app-layout'
import { SessionVerificationLevel } from '@clerk/types'
import { VerificationComponent } from '../components/security/security-verification'
import { toast } from '@repo/ui/components/ui/sonner'
import { useIsMobile } from '@repo/ui/hooks/use-mobile'
import { useReverification } from '@clerk/nextjs'
import { useSession } from '@clerk/nextjs'
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'
import { useUserContext } from '@/components/providers/user/user-provider'

export default function SecurityPage() {
  const isMobile = useIsMobile()
  const { user: { isLoaded, user }, auth } = useUserContext()
  const { session } = useSession()
  const { play: playSound } = useSoundWithSettings()

  const [sessions, setSessions] = useState<
    Awaited<ReturnType<NonNullable<typeof user>['getSessions']>> | null
  >(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [totpDialogOpen, setTotpDialogOpen] = useState(false)
  const [confirmDisable2Fa, setConfirmDisable2Fa] = useState(false)
  const [disable2FaPending, setDisable2FaPending] = useState(false)
  const [verificationState, setVerificationState] = useState<
    | {
      complete: () => void
      cancel: () => void
      level: SessionVerificationLevel | undefined
      inProgress: boolean
    }
    | undefined
  >(undefined)
  const [totpEnabledOverride, setTotpEnabledOverride] = useState<boolean | undefined>(undefined)

  const currentSessionId = session?.id ?? auth.sessionId ?? null

  const disable2FaWithReverify = useReverification(async () => {
    if (!user) return
    await user.disableTOTP()
    await user.reload()
  }, {
    onNeedsReverification: ({ complete, cancel, level }) => {
      setVerificationState({ complete, cancel, level, inProgress: true })
    }
  })

  const createTOTPWithReverify = useReverification(async () => {
    if (!user) throw new Error('No user')
    return user.createTOTP()
  }, {
    onNeedsReverification: ({ complete, cancel, level }) => {
      setVerificationState({ complete, cancel, level, inProgress: true })
    }
  })

  useEffect(() => {
    if (!user) return
    let cancelled = false
    user
      .getSessions()
      .then((s) => { if (!cancelled) setSessions(s) })
      .finally(() => { if (!cancelled) setSessionsLoading(false) })
    return () => { cancelled = true }
  }, [user])

  if (!isLoaded || !user) return null

  const totpEnabled =
    totpEnabledOverride ?? user.totpEnabled ?? user.twoFactorEnabled ?? false

  const handleEnable2Fa = () => setTotpDialogOpen(true)

  const handle2FaSetupSuccess = () => {
    setTotpEnabledOverride(undefined)
    playSound('success')
    setTotpDialogOpen(false)
  }

  const handleDisable2Fa = async () => {
    setDisable2FaPending(true)
    try {
      await disable2FaWithReverify()
      setTotpEnabledOverride(false)
      playSound('success')
      toast.success('Two-factor authentication disabled')
      setConfirmDisable2Fa(false)
      setVerificationState(undefined)
    } catch (err) {
      if (isClerkRuntimeError(err) && isReverificationCancelledError(err)) {
        toast.info('Verification was cancelled')
        setConfirmDisable2Fa(false)
        setVerificationState(undefined)
        return
      }
      toast.error(getClerkErrorMessage(err))
    } finally {
      setDisable2FaPending(false)
    }
  }

  const showVerification = verificationState?.inProgress === true

  const handleVerificationComplete = () => {
    verificationState?.complete()
    setVerificationState(undefined)
  }

  const handleVerificationCancel = () => {
    verificationState?.cancel()
    setVerificationState(undefined)
    setConfirmDisable2Fa(false)
  }

  return (
    <AppLayout
      label="Security"
      description="Manage your account security, sessions, and authentication methods."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AuthenticationCard user={user} />
        <SecuritySessionsCard
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          currentSessionId={currentSessionId}
        />
        <Security2FaCard
          totpEnabled={totpEnabled}
          disable2FaPending={disable2FaPending}
          confirmDisable2Fa={confirmDisable2Fa}
          onConfirmDisable2FaChange={setConfirmDisable2Fa}
          onEnable2Fa={handleEnable2Fa}
          onDisable2Fa={handleDisable2Fa}
        />
      </div>

      <Security2FaSetup
        open={totpDialogOpen}
        onOpenChange={setTotpDialogOpen}
        user={user}
        onSuccess={handle2FaSetupSuccess}
        createTOTPWithReverify={createTOTPWithReverify}
      />

      {showVerification && verificationState && (
        isMobile ? (
          <Drawer open={true} onOpenChange={(open) => !open && handleVerificationCancel()}>
            <DrawerContent className="sm:max-w-md">
              <DrawerHeader>
                <DrawerTitle>Verify your identity</DrawerTitle>
                <DrawerDescription>
                  Enter the code sent to your email to confirm this action.
                </DrawerDescription>
              </DrawerHeader>
              <div className="space-y-4 px-4 pb-4">
                <VerificationComponent
                  level={verificationState.level}
                  onComplete={handleVerificationComplete}
                  onCancel={handleVerificationCancel}
                />
              </div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={true} onOpenChange={(open) => !open && handleVerificationCancel()}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Verify your identity</DialogTitle>
                <DialogDescription>
                  Enter the code sent to your email to confirm this action.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <VerificationComponent
                  level={verificationState.level}
                  onComplete={handleVerificationComplete}
                  onCancel={handleVerificationCancel}
                />
              </div>
            </DialogContent>
          </Dialog>
        )
      )}
    </AppLayout>
  )
}
