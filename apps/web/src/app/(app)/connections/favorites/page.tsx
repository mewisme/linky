import { FavoritesClient } from "@/features/user/ui/favorites-client";
import { getFavorites } from '@/actions/resources/favorites'

export default async function FavoritesPage() {
  const data = await getFavorites()

  return <FavoritesClient initialData={data} />
}
