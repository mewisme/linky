'use client'

import { useMemo } from 'react'

import { AdminAPI } from '@/types/admin.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@repo/ui/lib/utils'

interface LevelRewardsDataTableProps {
  initialData: AdminAPI.LevelRewards.LevelReward[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function LevelRewardsDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: LevelRewardsDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

  return (
    <DataTable
      initialData={initialData}
      filterColumn="reward_type"
      filterPlaceholder="Search by reward type..."
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  )
}
