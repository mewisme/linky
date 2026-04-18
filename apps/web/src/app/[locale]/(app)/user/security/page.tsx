'use client'

import {
  AuthenticationCard,
  SecuritySessionsCard,
} from "@/features/user/ui/security";
import { useEffect, useState } from 'react'

import { AppLayout } from '@/shared/ui/layouts/app-layout'
import { useSession } from '@clerk/nextjs'
import { useUserContext } from '@/providers/user/user-provider'

export default function SecurityPage() {
  const { user: { isLoaded, user }, auth } = useUserContext()
  const { session } = useSession()

  const [sessions, setSessions] = useState<
    Awaited<ReturnType<NonNullable<typeof user>['getSessions']>> | null
  >(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)

  const currentSessionId = session?.id ?? auth.sessionId ?? null

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

  return (
    <AppLayout sidebarItem="security" className="space-y-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AuthenticationCard user={user} />
        <SecuritySessionsCard
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          currentSessionId={currentSessionId}
        />
      </div>
    </AppLayout>
  )
}
