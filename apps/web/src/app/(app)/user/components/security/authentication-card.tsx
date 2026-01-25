'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLock,
  IconMail,
  IconShield,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { Button } from '@repo/ui/components/ui/button'
import { PasswordModal } from './password-modal'
import { ProviderList } from './provider-list'
import type { UserResource } from '@clerk/types'

interface AuthenticationCardProps {
  user: UserResource
}

export function AuthenticationCard({ user }: AuthenticationCardProps) {
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
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <IconShield className="size-5" />
          <CardTitle>Authentication</CardTitle>
        </div>
        <CardDescription>Manage your sign-in methods and account authentication.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-3">
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <IconMail className="size-4" />
              Email
            </dt>
            <dd className="flex items-center gap-2 text-sm font-medium">
              {user.primaryEmailAddress?.emailAddress ?? '—'}
              {user.hasVerifiedEmailAddress ? (
                <IconCircleCheckFilled className="size-4 text-green-500" aria-label="Verified" />
              ) : (
                <IconCircleXFilled className="size-4 text-destructive" aria-label="Not verified" />
              )}
            </dd>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <IconLock className="size-4" />
              Password
            </dt>
            <dd className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openPasswordModal(hasPassword ? 'change' : 'set')}
              >
                {hasPassword ? 'Change password' : 'Set password'}
              </Button>
            </dd>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border p-3">
            <dt className="text-sm font-medium text-muted-foreground">Connected providers</dt>
            <dd>
              <ProviderList providers={user.externalAccounts} />
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
