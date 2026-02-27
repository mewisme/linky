'use server'

import type { ResourcesAPI } from '@/types/resources.types';
import { revalidateTag } from 'next/cache';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { cacheTags } from '@/lib/cache/tags';
import { withSentryAction, withSentryQuery } from '@/lib/sentry/with-action';

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
      { method: 'POST', body: JSON.stringify({ favorite_user_id: favoriteUserId }), token: true }
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
      { method: 'DELETE', token: true }
    );
    revalidateTag(cacheTags.favorites, 'max');
    return result;
  });
}
