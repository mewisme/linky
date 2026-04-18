'use client'

import { Fragment, useState } from 'react'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import { enUS, vi } from 'date-fns/locale'
import { formatDeviceLabel, formatLocation } from './security-utils'

import { Badge } from '@ws/ui/components/ui/badge'
import { Button } from '@ws/ui/components/ui/button'
import { Separator } from '@ws/ui/components/ui/separator'
import { cn } from '@ws/ui/lib/utils'
import { formatDistanceToNow } from '@ws/ui/internal-lib/date-fns'
import { useLocale, useTranslations } from 'next-intl'

const COLLAPSED_EXTRA = 1

export type SessionWithActivity = {
  id: string
  lastActiveAt: Date | number
  latestActivity?: {
    browserName?: string
    deviceType?: string
    city?: string
    country?: string
  } | null
}

interface ActiveSessionsListProps {
  sessions: SessionWithActivity[]
  currentSessionId: string | null
}

function SessionRow({
  session,
  isCurrent,
  unknownDevice,
  dfLocale,
}: {
  session: SessionWithActivity
  isCurrent: boolean
  unknownDevice: string
  dfLocale: typeof enUS
}) {
  const t = useTranslations('user.securitySessions')
  const loc = formatLocation(session.latestActivity)
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
      role="listitem"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {formatDeviceLabel(session.latestActivity, unknownDevice)}
        </p>
        {loc && (
          <p className="text-xs text-muted-foreground">
            {t('locationLabel', { location: loc })}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {t('lastActivePrefix')}{' '}
          {formatDistanceToNow(new Date(session.lastActiveAt), {
            locale: dfLocale,
            addSuffix: true,
          })}
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        {isCurrent && <Badge variant="secondary">{t('thisDevice')}</Badge>}
      </div>
    </div>
  )
}

export function ActiveSessionsList({
  sessions,
  currentSessionId,
}: ActiveSessionsListProps) {
  const t = useTranslations('user.securitySessions')
  const locale = useLocale()
  const dfLocale = locale === 'vi' ? vi : enUS
  const unknownDevice = t('unknownDevice')
  const [expanded, setExpanded] = useState(false)

  const current = sessions.find((s) => s.id === currentSessionId)
  const others = sessions.filter((s) => s.id !== currentSessionId)
  const sorted = [...(current ? [current] : []), ...others]

  const collapsedCount = 1 + COLLAPSED_EXTRA
  const hasMore = sorted.length > collapsedCount
  const visible = expanded ? sorted : sorted.slice(0, collapsedCount)

  const listContent = (
    <div
      id="active-sessions-list"
      role="list"
      className={cn(
        'space-y-2',
        expanded && 'max-h-80 overflow-y-auto'
      )}
    >
      {visible.map((s) => {
        const isCurrent = currentSessionId != null && s.id === currentSessionId
        const showSep = isCurrent && others.length > 0
        return (
          <Fragment key={s.id}>
            <SessionRow
              session={s}
              isCurrent={isCurrent}
              unknownDevice={unknownDevice}
              dfLocale={dfLocale}
            />
            {showSep && <Separator className="my-2" />}
          </Fragment>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-3">
      {listContent}
      {hasMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls="active-sessions-list"
        >
          {expanded ? (
            <>
              {t('showLess')}
              <IconChevronUp className="ml-2 size-4" aria-hidden />
            </>
          ) : (
            <>
              {t('viewAllSessions')}
              <IconChevronDown className="ml-2 size-4" aria-hidden />
            </>
          )}
        </Button>
      )}
    </div>
  )
}
