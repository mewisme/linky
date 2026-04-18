'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { useInterestTagColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'
import { useTranslations } from 'next-intl'

interface InterestTagsDataTableProps {
  initialData: AdminAPI.InterestTags.InterestTag[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function InterestTagsDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: InterestTagsDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useInterestTagColumns(callbacks)

  return (
    <div data-testid="admin-interest-tags-table">
      <DataTable
        initialData={initialData}
        filterColumn="name"
        filterPlaceholder={t('interestTags.filterPlaceholder')}
        initialColumnVisibility={{ id: false }}
        columns={tableColumns}
        className={cn(className)}
        leftColumnVisibilityContent={leftColumnVisibilityContent}
        rightColumnVisibilityContent={rightColumnVisibilityContent}
      />
    </div>
  )
}
