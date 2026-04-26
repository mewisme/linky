'use server'

import type { ResourcesAPI } from '@/shared/types/resources.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction, withSentryQuery } from '@/lib/monitoring/with-action';

export async function getFavorites(): Promise<ResourcesAPI.Favorites.Get.Response> {
  return withSentryQuery(
    "getFavorites",
    async () => serverFetch<ResourcesAPI.Favorites.Get.Response>(backendUrl.resources.favorites()),
  );
}

export async function addFavorite(
  favoriteUserId: string
): Promise<ResourcesAPI.Favorites.Create.Response> {
  return withSentryAction("addFavorite", async () =>
    serverFetch<ResourcesAPI.Favorites.Create.Response>(
      backendUrl.resources.favorites(),
      { method: 'POST', body: JSON.stringify({ favorite_user_id: favoriteUserId }) }
    ));
}

export async function removeFavorite(
  favoriteUserId: string
): Promise<ResourcesAPI.Favorites.Delete.Response> {
  return withSentryAction("removeFavorite", async () =>
    serverFetch<ResourcesAPI.Favorites.Delete.Response>(
      backendUrl.resources.favoriteByUserId(favoriteUserId),
      { method: 'DELETE' }
    ));
}
