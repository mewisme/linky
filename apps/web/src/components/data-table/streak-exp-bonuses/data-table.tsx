'use client'

import { useMemo } from 'react'

import { AdminAPI } from '@/types/admin.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'

interface StreakExpBonusesDataTableProps {
  initialData: AdminAPI.StreakExpBonuses.StreakExpBonus[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function StreakExpBonusesDataTable({ initialData, className = '', callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: StreakExpBonusesDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <DataTable
      initialData={initialData}
      filterColumn="bonus_multiplier"
      filterPlaceholder="Search by multiplier..."
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={className}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  )
}
