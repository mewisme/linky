'use client'

import { useEffect, useState } from 'react'

import { AppLayout } from '@/components/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import type { ResourcesAPI } from '@/types/resources.types'
import dynamic from 'next/dynamic'
import { toast } from '@ws/ui/components/ui/sonner'
import { useQuery } from '@tanstack/react-query'
import { getFavorites, removeFavorite } from '@/lib/actions/resources/favorites'

const FavoritesDataTable = dynamic(
  () => import('@/components/data-table/favorites/data-table').then(mod => ({ default: mod.FavoritesDataTable }))
)

interface FavoritesClientProps {
  initialData: ResourcesAPI.Favorites.Get.Response
}

export function FavoritesClient({ initialData }: FavoritesClientProps) {
  const [data, setData] = useState<ResourcesAPI.Favorites.FavoriteWithStats[]>(initialData.data)

  const { data: favorites, isFetching, refetch } = useQuery({
    queryKey: ['user-favorites'],
    queryFn: () => getFavorites(),
    initialData,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (favorites) {
      setData(favorites.data)
    }
  }, [favorites])

  const handleRemoveFavorite = async (favorite: ResourcesAPI.Favorites.FavoriteWithStats) => {
    if (!favorite.favorite_user_id) {
      toast.error("Invalid favorite data")
      return
    }

    try {
      const result = await removeFavorite(favorite.favorite_user_id)

      setData((prev) => prev.filter((f) => f.favorite_user_id !== favorite.favorite_user_id))

      if (result.refunded) {
        toast.success("Removed from favorites (daily limit refunded)")
      } else {
        toast.success("Removed from favorites")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove favorite")
    }
  }

  return (
    <AppLayout label="My Favorites" description="Manage your favorite users and view your match statistics">
      <FavoritesDataTable
        initialData={data}
        callbacks={{
          onRemove: handleRemoveFavorite,
        }}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />
    </AppLayout>
  )
}
