'use client'

import { getBlockedUsers, unblockUser } from "@/features/user/api/blocks";
import { useState, useTransition } from 'react'

import { AppLayout } from '@/shared/ui/layouts/app-layout'
import type { BlockedUserWithDetails } from '@/entities/notification/types/notifications.types'
import { Button } from '@ws/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import { toast } from '@ws/ui/components/ui/sonner'
import { useTranslations } from 'next-intl'
import { trackEvent } from '@/lib/telemetry/events/client'
import { useBlockedUsersStore } from "@/features/user/model/blocked-users-store";

const BlockedUsersDataTable = dynamic(
  () => import('@/shared/ui/data-table/blocked-users/data-table').then(mod => ({ default: mod.BlockedUsersDataTable })),
  { ssr: false }
)

interface Props {
  initialData: BlockedUserWithDetails[]
}

export function BlockedUsersClient({ initialData }: Props) {
  const t = useTranslations('user')
  const [data, setData] = useState<BlockedUserWithDetails[]>(initialData)
  const [isFetching, startFetching] = useTransition()

  const handleRefresh = () => {
    startFetching(async () => {
      try {
        const res = await getBlockedUsers()
        setData(res.blocked_users)
      } catch {
        toast.error(t('blockedLoadFailed'))
      }
    })
  }

  const handleUnblock = async (user: BlockedUserWithDetails) => {
    try {
      await unblockUser(user.blocked_user_id)
      useBlockedUsersStore.getState().unblockUser(user.blocked_user_id)
      setData((prev) => prev.filter((u) => u.id !== user.id))
      trackEvent({ name: 'user_unblocked' })
      toast.success(t('userUnblocked'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('unblockFailed'))
    }
  }

  return (
    <AppLayout label={t('blockedUsersTitle')} description={t('blockedUsersDescription')}>
      <BlockedUsersDataTable
        initialData={data}
        callbacks={{ onUnblock: handleUnblock }}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />
    </AppLayout>
  )
}
