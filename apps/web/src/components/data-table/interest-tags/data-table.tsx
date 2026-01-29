'use client'

import { useMemo } from 'react'

import { AdminAPI } from '@/types/admin.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@repo/ui/lib/utils'

interface InterestTagsDataTableProps {
  initialData: AdminAPI.InterestTags.InterestTag[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function InterestTagsDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: InterestTagsDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <div data-testid="admin-interest-tags-table">
      <DataTable
        initialData={initialData}
        filterColumn="name"
        filterPlaceholder="Search tags..."
        initialColumnVisibility={{ id: false }}
        columns={tableColumns}
        className={cn(className)}
        leftColumnVisibilityContent={leftColumnVisibilityContent}
        rightColumnVisibilityContent={rightColumnVisibilityContent}
      />
    </div>
  )
}