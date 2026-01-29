'use client'

import { useMemo } from 'react'

import type { ResourcesAPI } from '@/types/resources.types'
import { columns, type RowCallbacks } from './define-data'
import { DataTable } from '../data-table'
import { cn } from '@repo/ui/lib/utils'

interface FavoritesDataTableProps {
  initialData: ResourcesAPI.Favorites.FavoriteWithStats[]
  className?: string
  callbacks?: RowCallbacks
  leftColumnVisibilityContent?: React.ReactNode
}

export function FavoritesDataTable({ initialData, className, callbacks, leftColumnVisibilityContent = null }: FavoritesDataTableProps) {
  const tableColumns = useMemo(() => columns(callbacks), [callbacks])

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
