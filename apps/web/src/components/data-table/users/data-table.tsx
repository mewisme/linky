'use client'

import { useMemo } from 'react'

import type { AdminAPI } from '@/types/admin.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@repo/ui/lib/utils'

interface UsersDataTableProps {
  initialData: AdminAPI.User[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  bulkActionsContent?: (selectedRows: AdminAPI.User[]) => React.ReactNode
}

export function UsersDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, bulkActionsContent }: UsersDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <div data-testid="admin-users-table">
      <DataTable
        initialData={initialData}
        filterColumn="email"
        initialColumnVisibility={{
          id: false,
          clerk_user_id: false,
          first_name: false,
          last_name: false,
          bio: false,
          interest_tag_names: false,
          embedding_status: false,
          embedding_updated_at: false,
          created_at: false,
          updated_at: false,
        }}
        columns={tableColumns}
        className={cn(className)}
        leftColumnVisibilityContent={leftColumnVisibilityContent}
        bulkActionsContent={bulkActionsContent}
        getRowClassName={(row) => (row.deleted ? 'opacity-60 bg-muted/30' : undefined)}
      />
    </div>
  )
}