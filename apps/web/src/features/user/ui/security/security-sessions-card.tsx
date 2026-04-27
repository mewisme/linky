'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ws/ui/components/ui/card'
import { IconDeviceDesktop } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@ws/ui/components/ui/skeleton'
import { ActiveSessionsList, type SessionWithActivity } from './active-sessions-list'
import { ShaderCard } from '@ws/ui/components/mew-ui/shader/shader-card'

interface SecuritySessionsCardProps {
  sessions: SessionWithActivity[] | null
  sessionsLoading: boolean
  currentSessionId: string | null
}

export function SecuritySessionsCard({
  sessions,
  sessionsLoading,
  currentSessionId,
}: SecuritySessionsCardProps) {
  const t = useTranslations('user.securitySessions')
  return (
    <ShaderCard>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <IconDeviceDesktop className="size-5" />
          <CardTitle>{t('title')}</CardTitle>
        </div>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sessionsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : sessions && sessions.length > 0 ? (
          <ActiveSessionsList sessions={sessions} currentSessionId={currentSessionId} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        )}
      </CardContent>
    </ShaderCard>
  )
}
