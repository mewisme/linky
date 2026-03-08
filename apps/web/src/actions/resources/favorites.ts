'use server'

import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

import type { ResourcesAPI } from '@/shared/types/resources.types';
import { backendUrl } from '@/lib/http/backend-url';
import { cacheTags } from '@/lib/cache/tags';
import { revalidateTag } from 'next/cache';
import { serverFetch } from '@/lib/http/server-api';

export async function getFavorites(): Promise<ResourcesAPI.Favorites.Get.Response> {
  return withSentryQuery(
    "getFavorites",
    async (token) => serverFetch<ResourcesAPI.Favorites.Get.Response>(
      backendUrl.resources.favorites(), { preloadedToken: token }
    ),
    { keyParts: [cacheTags.favorites], tags: [cacheTags.favorites] },
  );
}

export async function addFavorite(
  favoriteUserId: string
): Promise<ResourcesAPI.Favorites.Create.Response> {
  return withSentryAction("addFavorite", async () => {
    const result = await serverFetch<ResourcesAPI.Favorites.Create.Response>(
      backendUrl.resources.favorites(),
      { method: 'POST', body: JSON.stringify({ favorite_user_id: favoriteUserId }) }
    );
    revalidateTag(cacheTags.favorites, 'max');
    return result;
  });
}

export async function removeFavorite(
  favoriteUserId: string
): Promise<ResourcesAPI.Favorites.Delete.Response> {
  return withSentryAction("removeFavorite", async () => {
    const result = await serverFetch<ResourcesAPI.Favorites.Delete.Response>(
      backendUrl.resources.favoriteByUserId(favoriteUserId),
      { method: 'DELETE' }
    );
    revalidateTag(cacheTags.favorites, 'max');
    return result;
  });
}
