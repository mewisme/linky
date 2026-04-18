'use client'

import type { CallHistoryRecord } from '@/entities/call-history/types/call-history.types'
import { useCallHistoryColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'

interface CallHistoryDataTableProps {
  initialData: CallHistoryRecord[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function CallHistoryDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null }: CallHistoryDataTableProps) {
  const tableColumns = useCallHistoryColumns(callbacks)

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
    />
  )
}
