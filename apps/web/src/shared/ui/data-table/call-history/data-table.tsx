'use client'

import type { CallHistoryRecord } from '@/entities/call-history/types/call-history.types'
import { useCallHistoryColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'
import { useTranslations } from 'next-intl'

interface CallHistoryDataTableProps {
  initialData: CallHistoryRecord[]
  isLoading?: boolean
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function CallHistoryDataTable({ initialData, isLoading = false, className, callbacks, leftColumnVisibilityContent = null }: CallHistoryDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useCallHistoryColumns(callbacks)

  return (
    <div data-testid="call-history-table">
      <DataTable
        initialData={initialData}
        isLoading={isLoading}
        loadingTitle={t('callHistory.loadingTitle')}
        initialColumnVisibility={{ id: false }}
        columns={tableColumns}
        className={cn(className)}
        leftColumnVisibilityContent={leftColumnVisibilityContent}
      />
    </div>
  )
}
