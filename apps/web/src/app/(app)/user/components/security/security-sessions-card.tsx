'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ws/ui/components/ui/card'
import { IconDeviceDesktop } from '@tabler/icons-react'
import { Skeleton } from '@ws/ui/components/ui/skeleton'
import { ActiveSessionsList, type SessionWithActivity } from './active-sessions-list'

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
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <IconDeviceDesktop className="size-5" />
          <CardTitle>Active Sessions</CardTitle>
        </div>
        <CardDescription>Devices and browsers where you are signed in</CardDescription>
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
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        )}
      </CardContent>
    </Card>
  )
}
