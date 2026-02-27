'use client'

import { useState, useTransition } from 'react'
import dynamic from 'next/dynamic'

import { AppLayout } from '@/components/layouts/app-layout'
import type { BlockedUserWithDetails } from '@/types/notifications.types'
import { Button } from '@ws/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { getBlockedUsers, unblockUser } from '@/lib/actions/user/blocks'
import { toast } from '@ws/ui/components/ui/sonner'
import { trackEvent } from '@/lib/analytics/events/client'
import { useBlockedUsersStore } from '@/stores/blocked-users-store'

const BlockedUsersDataTable = dynamic(
  () => import('@/components/data-table/blocked-users/data-table').then(mod => ({ default: mod.BlockedUsersDataTable })),
  { ssr: false }
)

interface Props {
  initialData: BlockedUserWithDetails[]
}

export function BlockedUsersClient({ initialData }: Props) {
  const [data, setData] = useState<BlockedUserWithDetails[]>(initialData)
  const [isFetching, startFetching] = useTransition()

  const handleRefresh = () => {
    startFetching(async () => {
      try {
        const res = await getBlockedUsers()
        setData(res.blocked_users)
      } catch {
        toast.error('Failed to load blocked users')
      }
    })
  }

  const handleUnblock = async (user: BlockedUserWithDetails) => {
    try {
      await unblockUser(user.blocked_user_id)
      useBlockedUsersStore.getState().unblockUser(user.blocked_user_id)
      setData((prev) => prev.filter((u) => u.id !== user.id))
      trackEvent({ name: 'user_unblocked' })
      toast.success('User unblocked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unblock user')
    }
  }

  return (
    <AppLayout label="Blocked Users" description="Manage users you have blocked">
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
