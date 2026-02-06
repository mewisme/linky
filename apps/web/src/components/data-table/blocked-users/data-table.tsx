'use client'

import { useMemo } from 'react'

import type { BlockedUserWithDetails } from '@/types/notifications.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@repo/ui/lib/utils'

interface BlockedUsersDataTableProps {
  initialData: BlockedUserWithDetails[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function BlockedUsersDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null }: BlockedUsersDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      filterColumn="blocked_user"
      filterPlaceholder="Search blocked users..."
    />
  )
}
