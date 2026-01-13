'use client'

import { useMemo } from 'react'

import type { CallHistoryRecord } from '@/types/call-history.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'

interface CallHistoryDataTableProps {
  initialData: CallHistoryRecord[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function CallHistoryDataTable({ initialData, className = '', callbacks, leftColumnVisibilityContent = null }: CallHistoryDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={className}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
    />
  )
}