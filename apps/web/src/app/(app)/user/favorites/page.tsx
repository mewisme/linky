'use client'

import { useEffect, useState } from 'react'

import { AppLayout } from '@/components/layouts/app-layout'
import { Button } from '@repo/ui/components/ui/button'
import { FavoritesDataTable } from '@/components/data-table/favorites/data-table'
import { IconRefresh } from '@tabler/icons-react'
import type { ResourcesAPI } from '@/types/resources.types'
import { logger } from '@/utils/logger'
import { toast } from '@repo/ui/components/ui/sonner'
import { useQuery } from '@tanstack/react-query'
import { useUserContext } from '@/components/providers/user'

export default function FavoritesPage() {
  const { state } = useUserContext()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<ResourcesAPI.Favorites.FavoriteWithStats[]>([])

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken()
      setToken(token)
    }
    fetchToken()
  }, [state])

  const { data: favorites, isFetching, refetch } = useQuery({
    queryKey: ['user-favorites'],
    queryFn: async () => {
      const res = await fetch(`/api/resources/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Failed to load data")
      return res.json() as Promise<ResourcesAPI.Favorites.Get.Response>
    },
    enabled: !!token,
  })

  useEffect(() => {
    if (favorites) {
      setData(favorites.data)
    }
  }, [favorites])

  const handleRemoveFavorite = async (favorite: ResourcesAPI.Favorites.FavoriteWithStats) => {
    try {
      const currentToken = await state.getToken();
      if (!currentToken) {
        toast.error("Authentication required")
        return
      }

      if (!favorite.favorite_user_id) {
        logger.error("Missing favorite_user_id:", favorite)
        toast.error("Invalid favorite data")
        return
      }

      const response = await fetch(`/api/resources/favorites/${favorite.favorite_user_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.message || "Failed to remove favorite")
        return
      }

      setData((prev) => prev.filter((f) => f.favorite_user_id !== favorite.favorite_user_id))

      const result = await response.json()
      if (result.refunded) {
        toast.success("Removed from favorites (daily limit refunded)")
      } else {
        toast.success("Removed from favorites")
      }
    } catch (error) {
      logger.error("Failed to remove favorite:", error)
      toast.error("Failed to remove favorite")
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
