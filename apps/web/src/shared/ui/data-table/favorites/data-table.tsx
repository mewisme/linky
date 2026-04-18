'use client'

import type { ResourcesAPI } from '@/shared/types/resources.types'
import { useFavoritesColumns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@ws/ui/lib/utils'

interface FavoritesDataTableProps {
  initialData: ResourcesAPI.Favorites.FavoriteWithStats[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function FavoritesDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null }: FavoritesDataTableProps) {
  const tableColumns = useFavoritesColumns(callbacks)

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
    />
  )
}
