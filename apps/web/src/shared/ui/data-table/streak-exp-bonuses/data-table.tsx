'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { useStreakExpBonusColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'
import { useTranslations } from 'next-intl'

interface StreakExpBonusesDataTableProps {
  initialData: AdminAPI.StreakExpBonuses.StreakExpBonus[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function StreakExpBonusesDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: StreakExpBonusesDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useStreakExpBonusColumns(callbacks)

  return (
    <DataTable
      initialData={initialData}
      filterColumn="bonus_multiplier"
      filterPlaceholder={t('streakExpBonuses.filterPlaceholder')}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  )
}
