'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { useLevelFeatureUnlockColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'
import { useTranslations } from 'next-intl'

interface LevelFeatureUnlocksDataTableProps {
  initialData: AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function LevelFeatureUnlocksDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: LevelFeatureUnlocksDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useLevelFeatureUnlockColumns(callbacks)

  return (
    <DataTable
      initialData={initialData}
      filterColumn="feature_key"
      filterPlaceholder={t('levelFeatureUnlocks.filterPlaceholder')}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  )
}
