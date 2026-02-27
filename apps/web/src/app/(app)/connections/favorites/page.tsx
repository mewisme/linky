import type { ResourcesAPI } from '@/types/resources.types'
import { FavoritesClient } from './favorites-client'
import { backendUrl } from '@/lib/api/fetch/backend-url'
import { serverFetch } from '@/lib/api/fetch/server-api'

export default async function FavoritesPage() {
  const data = await serverFetch<ResourcesAPI.Favorites.Get.Response>(
    backendUrl.resources.favorites(),
    { token: true }
  )

  return <FavoritesClient initialData={data} />
}
