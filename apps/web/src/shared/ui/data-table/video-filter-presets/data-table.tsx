'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { useVideoFilterPresetColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'
import { useTranslations } from 'next-intl'

interface VideoFilterPresetsDataTableProps {
  initialData: AdminAPI.VideoFilterPresets.VideoFilterPreset[]
  isLoading?: boolean
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
  rightColumnVisibilityContent?: React.ReactNode
}

export function VideoFilterPresetsDataTable({ initialData, isLoading = false, className, callbacks, leftColumnVisibilityContent = null, rightColumnVisibilityContent = null }: VideoFilterPresetsDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useVideoFilterPresetColumns(callbacks)

  return (
    <div data-testid="admin-video-filter-presets-table">
      <DataTable
        initialData={initialData}
        isLoading={isLoading}
        loadingTitle={t('videoFilterPresets.loadingTitle')}
        filterColumns="name"
        filterPlaceholder={t('videoFilterPresets.filterPlaceholder')}
        initialColumnVisibility={{ id: false }}
        columns={tableColumns}
        className={cn(className)}
        leftColumnVisibilityContent={leftColumnVisibilityContent}
        rightColumnVisibilityContent={rightColumnVisibilityContent}
      />
    </div>
  )
}
