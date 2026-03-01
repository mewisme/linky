'use client'

import { useMemo } from 'react'

import type { AdminAPI } from '@/features/admin/types/admin.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'

interface AdminReportsDataTableProps {
  initialData: AdminAPI.Reports.Report[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function AdminReportsDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: AdminReportsDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <DataTable
      initialData={initialData}
      filterColumn="reason"
      filterPlaceholder="Filter by reason..."
      initialColumnVisibility={{
        reviewed_by: false,
      }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  )
}
