'use client'

import { useMemo } from 'react'

import { ResourcesAPI } from '@/types/resources.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'

interface ChangelogsDataTableProps {
  initialData: ResourcesAPI.Changelogs.Changelog[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function ChangelogsDataTable({ initialData, className = '', callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: ChangelogsDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{ id: false, created_at: false, updated_at: false }}
      columns={tableColumns}
      className={className}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  )
}