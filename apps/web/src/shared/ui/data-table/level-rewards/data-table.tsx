'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { useLevelRewardColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'
import { useTranslations } from 'next-intl'

interface LevelRewardsDataTableProps {
  initialData: AdminAPI.LevelRewards.LevelReward[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function LevelRewardsDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: LevelRewardsDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useLevelRewardColumns(callbacks)

  return (
    <DataTable
      initialData={initialData}
      filterColumn="reward_type"
      filterPlaceholder={t('levelRewards.filterPlaceholder')}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  )
}
