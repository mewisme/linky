'use client'

import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route'
import { resolveActionErrorMessage } from '@/shared/lib/i18n/resolve-action-error-message'
import { useState, useTransition } from 'react'

import { AppLayout } from '@/shared/ui/layouts/app-layout'
import type {
  BlockedUserWithDetails,
  BlockedUsersResponse,
} from '@/entities/notification/types/notifications.types'
import { Button } from '@ws/ui/components/ui/button'
import dynamic from 'next/dynamic'
import { toast } from '@ws/ui/components/ui/sonner'
import { useTranslations } from 'next-intl'
import { trackEvent } from '@/lib/telemetry/events/client'
import { useBlockedUsersStore } from "@/features/user/model/blocked-users-store";
import { DataTableRefreshButton } from '@/shared/ui/data-table/refresh-button'

const BlockedUsersDataTable = dynamic(
  () => import('@/shared/ui/data-table/blocked-users/data-table').then(mod => ({ default: mod.BlockedUsersDataTable })),
  { ssr: false }
)

interface Props {
  initialData: BlockedUserWithDetails[]
}

export function BlockedUsersClient({ initialData }: Props) {
  const t = useTranslations('user')
  const tRoot = useTranslations()
  const [data, setData] = useState<BlockedUserWithDetails[]>(initialData)
  const [isFetching, startFetching] = useTransition()

  const handleRefresh = () => {
    startFetching(async () => {
      try {
        const res = await fetchFromActionRoute<BlockedUsersResponse>('/api/users/blocks/me')
        setData(res.blocked_users)
      } catch (error) {
        toast.error(resolveActionErrorMessage(error, tRoot, 'user.blockedLoadFailed'))
      }
    })
  }

  const handleUnblock = async (user: BlockedUserWithDetails) => {
    try {
      await fetchFromActionRoute<void>(
        `/api/users/blocks/${encodeURIComponent(user.blocked_user_id)}`,
        { method: 'DELETE' },
      )
      useBlockedUsersStore.getState().unblockUser(user.blocked_user_id)
      setData((prev) => prev.filter((u) => u.id !== user.id))
      trackEvent({ name: 'user_unblocked' })
      toast.success(t('userUnblocked'))
    } catch (error) {
      toast.error(resolveActionErrorMessage(error, tRoot, 'user.unblockFailed'))
    }
  }

  return (
    <AppLayout label={t('blockedUsersTitle')} description={t('blockedUsersDescription')}>
      <BlockedUsersDataTable
        initialData={data}
        isLoading={isFetching && data.length === 0}
        callbacks={{ onUnblock: handleUnblock }}
        leftColumnVisibilityContent={
          <DataTableRefreshButton onClick={handleRefresh} isFetching={isFetching} />
        }
      />
    </AppLayout>
  )
}
