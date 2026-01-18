'use client'

import { useMemo } from 'react'

import type { AdminAPI } from '@/types/admin.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'

interface UsersDataTableProps {
  initialData: AdminAPI.User[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function UsersDataTable({ initialData, className = '', callbacks, leftColumnVisibilityContent = null }: UsersDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <DataTable
      initialData={initialData}
      filterColumn="email"
      initialColumnVisibility={{
        id: false,
        clerk_user_id: false,
        created_at: false,
        updated_at: false,
      }}
      columns={tableColumns}
      className={className}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
    />
  )
}