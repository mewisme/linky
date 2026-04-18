'use client'

import type { AdminAPI } from '@/features/admin/types/admin.types'
import { useUsersColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'

interface UsersDataTableProps {
  initialData: AdminAPI.User[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  bulkActionsContent?: (selectedRows: AdminAPI.User[]) => React.ReactNode
  selectionResetKey?: unknown
}

export function UsersDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, bulkActionsContent, selectionResetKey }: UsersDataTableProps) {
  const tableColumns = useUsersColumns(callbacks)

  return (
    <div data-testid="admin-users-table">
      <DataTable
        initialData={initialData}
        filterColumn="email"
        initialColumnVisibility={{
          id: false,
          avatar_url: false,
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
        selectionResetKey={selectionResetKey}
      />
    </div>
  )
}