import type { ResourcesAPI } from '@/types/resources.types'
import { FavoritesClient } from './favorites-client'
import { apiUrl } from '@/lib/api/fetch/api-url'
import { fetchData } from '@/lib/api/fetch/server-api'

async function fetchFavorites(): Promise<ResourcesAPI.Favorites.Get.Response> {
  return fetchData<ResourcesAPI.Favorites.Get.Response>(
    apiUrl.resources.favorites(),
    { token: true }
  )
}

export default async function FavoritesPage() {
  const data = await fetchFavorites()
  return <FavoritesClient initialData={data} />
}
