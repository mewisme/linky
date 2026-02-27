'use server'

import type { ResourcesAPI } from '@/types/resources.types';
import { backendUrl } from '@/lib/api/fetch/backend-url';
import { serverFetch } from '@/lib/api/fetch/server-api';
import { trackEventServer } from '@/lib/analytics/events/server';
import { withSentryAction } from '@/lib/sentry/with-action';

export async function getFavorites(): Promise<ResourcesAPI.Favorites.Get.Response> {
  return withSentryAction("getFavorites", async () => {
    trackEventServer({ name: 'api_resources_favorites_get' });
    return serverFetch(backendUrl.resources.favorites(), { token: true });
  });
}

export async function addFavorite(
  favoriteUserId: string
): Promise<ResourcesAPI.Favorites.Create.Response> {
  return withSentryAction("addFavorite", async () => {
    trackEventServer({ name: 'api_resources_favorites_post', properties: { user_id: favoriteUserId } });
    return serverFetch(backendUrl.resources.favorites(), {
      method: 'POST',
      body: JSON.stringify({ favorite_user_id: favoriteUserId }),
      token: true,
    });
  });
}

export async function removeFavorite(favoriteUserId: string): Promise<ResourcesAPI.Favorites.Delete.Response> {
  return withSentryAction("removeFavorite", async () => {
    trackEventServer({ name: 'api_resources_favorites_favorite_user_id_delete', properties: { user_id: favoriteUserId } });
    return serverFetch(backendUrl.resources.favoriteByUserId(favoriteUserId), {
      method: 'DELETE',
      token: true,
    });
  });
}
