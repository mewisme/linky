'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ws/ui/components/ui/card'
import {
  IconBrandApple,
  IconBrandFacebook,
  IconBrandGoogle,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLock,
  IconMail,
  IconShield,
} from '@tabler/icons-react'

import type { UserResource } from '@clerk/types'
import { formatProvider } from './security-utils'

function ProviderIcon({ provider }: { provider: string }) {
  const p = provider.toLowerCase().replace(/^oauth_/, '')
  if (p === 'google') return <IconBrandGoogle className="size-4" />
  if (p === 'facebook') return <IconBrandFacebook className="size-4" />
  if (p === 'apple') return <IconBrandApple className="size-4" />
  return null
}

interface SecurityAuthMethodsCardProps {
  user: UserResource
}

export function SecurityAuthMethodsCard({ user }: SecurityAuthMethodsCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <IconShield className="size-5" />
          <CardTitle>Authentication Methods</CardTitle>
        </div>
        <CardDescription>Email, password, and connected sign-in providers</CardDescription>
      </CardHeader>
      <CardContent>
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
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <IconLock className="size-4" />
              Password
            </dt>
            <dd className="text-sm font-medium">{user.passwordEnabled ? 'Set' : 'Not set'}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border p-3">
            <dt className="text-sm font-medium text-muted-foreground">Connected providers</dt>
            <dd className="flex flex-wrap gap-2">
              {user.externalAccounts.length > 0 ? (
                user.externalAccounts.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium"
                  >
                    <ProviderIcon provider={a.provider} />
                    {formatProvider(a.provider)}
                  </span>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
