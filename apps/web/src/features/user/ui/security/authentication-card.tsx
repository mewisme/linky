/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ws/ui/components/ui/card'
import type { useUser } from '@clerk/nextjs'
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLock,
  IconMail,
  IconShield,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { PasswordModal } from './password-modal'
import { ProviderList } from './provider-list'
import { useTranslations } from 'next-intl'

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>

interface AuthenticationCardProps {
  user: ClerkUser
}

export function AuthenticationCard({ user }: AuthenticationCardProps) {
  const t = useTranslations('user.auth')
  const tu = useTranslations('user')
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordModalMode, setPasswordModalMode] = useState<'change' | 'set'>('change')
  const [hasPassword, setHasPassword] = useState(user.passwordEnabled)

  useEffect(() => {
    if (!user) return
    setHasPassword(user.passwordEnabled)
  }, [user])

  const openPasswordModal = (mode: 'change' | 'set') => {
    setPasswordModalMode(mode)
    setPasswordModalOpen(true)
  }

  return (
    <Card data-testid="security-authentication-card">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <IconShield className="size-5" />
          <CardTitle>{t('title')}</CardTitle>
        </div>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-3">
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <IconMail className="size-4" />
              {t('email')}
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium">
              {user.primaryEmailAddress?.emailAddress ?? t('emailEmpty')}
              {user.hasVerifiedEmailAddress ? (
                <IconCircleCheckFilled className="size-4 text-green-500" aria-label={t('verified')} />
              ) : (
                <IconCircleXFilled className="size-4 text-destructive" aria-label={t('notVerified')} />
              )}
            </dd>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <IconLock className="size-4" />
              {t('password')}
            </dt>
            <dd className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPasswordModal(hasPassword ? 'change' : 'set')}
                data-testid="security-password-open-dialog"
              >
                {hasPassword ? tu('passwordChangeTitle') : tu('passwordSetTitle')}
              </Button>
            </dd>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border p-3">
            <dt className="text-sm font-medium text-muted-foreground">{t('connectedProviders')}</dt>
            <dd>
              <ProviderList userProviders={user.externalAccounts} />
            </dd>
          </div>
        </dl>
      </CardContent>

      <PasswordModal
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
        user={user}
        mode={passwordModalMode}
      />
    </Card>
  )
}
