'use client'

import type { BlockedUserWithDetails } from '@/entities/notification/types/notifications.types'
import { useBlockedUsersColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'
import { useTranslations } from 'next-intl'

interface BlockedUsersDataTableProps {
  initialData: BlockedUserWithDetails[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function BlockedUsersDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null }: BlockedUsersDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useBlockedUsersColumns(callbacks)

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      filterColumn="blocked_user"
      filterPlaceholder={t('blockedUsers.searchPlaceholder')}
    />
  )
}
