'use client'

import type { AdminAPI } from '@/features/admin/types/admin.types'
import { useUsersColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'
import { useTranslations } from 'next-intl'

interface UsersDataTableProps {
  initialData: AdminAPI.User[]
  isLoading?: boolean
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  bulkActionsContent?: (selectedRows: AdminAPI.User[]) => React.ReactNode
  selectionResetKey?: unknown
}

export function UsersDataTable({ initialData, isLoading = false, className, callbacks, leftColumnVisibilityContent = null, bulkActionsContent, selectionResetKey }: UsersDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useUsersColumns(callbacks)

  return (
    <div data-testid="admin-users-table">
      <DataTable
        initialData={initialData}
        isLoading={isLoading}
        loadingTitle={t('users.loadingTitle')}
        filterColumns="email"
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