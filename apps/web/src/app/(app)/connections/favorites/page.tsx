import { FavoritesClient } from './favorites-client'
import { getFavorites } from '@/lib/actions/resources/favorites'

export default async function FavoritesPage() {
  const data = await getFavorites()

  return <FavoritesClient initialData={data} />
}
