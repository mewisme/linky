'use client'

import { useMemo } from 'react'

import type { ResourcesAPI } from '@/types/resources.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@repo/ui/lib/utils'

interface ReportsDataTableProps {
  initialData: ResourcesAPI.Reports.Report[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function ReportsDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null }: ReportsDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

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
