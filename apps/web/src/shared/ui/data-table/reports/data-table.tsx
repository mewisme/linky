'use client'

import type { ResourcesAPI } from '@/shared/types/resources.types'
import { useReportColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'

interface ReportsDataTableProps {
  initialData: ResourcesAPI.Reports.Report[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function ReportsDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null }: ReportsDataTableProps) {
  const tableColumns = useReportColumns(callbacks)

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{}}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
    />
  )
}
