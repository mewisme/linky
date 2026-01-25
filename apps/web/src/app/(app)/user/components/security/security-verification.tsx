'use client'

import {
  EmailCodeFactor,
  SessionVerificationLevel,
  SessionVerificationResource,
} from '@clerk/types'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@repo/ui/components/ui/input-otp"
import { useEffect, useRef, useState } from 'react'

import { Button } from "@repo/ui/components/ui/button"
import { REGEXP_ONLY_DIGITS } from "@repo/ui/internal-lib/input-otp"
import { getClerkErrorMessage } from './security-utils'
import { toast } from '@repo/ui/components/ui/sonner'
import { useSession } from '@clerk/nextjs'

export function VerificationComponent({
  level = 'first_factor',
  onComplete,
  onCancel,
}: {
  level: SessionVerificationLevel | undefined
  onComplete: () => void
  onCancel: () => void
}) {
  const { session } = useSession()
  const [code, setCode] = useState<string>('')
  const reverificationRef = useRef<SessionVerificationResource | undefined>(undefined)
  const [determinedStartingFirstFactor, setDeterminedStartingFirstFactor] = useState<
    EmailCodeFactor | undefined
  >()

  useEffect(() => {
    if (reverificationRef.current) {
      return
    }

    session?.startVerification({ level }).then(async (response) => {
      reverificationRef.current = response
      await prepareEmailVerification(response)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prepareEmailVerification = async (verificationResource: SessionVerificationResource) => {
    if (verificationResource.status === 'needs_first_factor') {
      const determinedStartingFirstFactor = verificationResource.supportedFirstFactors?.filter(
        (factor) => factor.strategy === 'email_code',
      )[0]

      if (determinedStartingFirstFactor) {
        setDeterminedStartingFirstFactor(determinedStartingFirstFactor)
        await session?.prepareFirstFactorVerification({
          strategy: determinedStartingFirstFactor.strategy,
          emailAddressId: determinedStartingFirstFactor?.emailAddressId,
        })
      }
    }
  }

  const handleVerificationAttempt = async () => {
    try {
      await session?.attemptFirstFactorVerification({
        strategy: 'email_code',
        code,
      })
      onComplete()
    } catch (e) {
      toast.error(getClerkErrorMessage(e))
    }
  }

  if (!determinedStartingFirstFactor) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground text-center">
        Enter verification code sent to{" "}
        <span className="font-medium text-foreground">
          {determinedStartingFirstFactor.safeIdentifier || ""}
        </span>
      </p>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(value) => setCode(value)}
          pattern={REGEXP_ONLY_DIGITS}
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
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="default"
          className="w-full"
          onClick={async () => handleVerificationAttempt()}
        >
          Complete
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => onCancel()}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}