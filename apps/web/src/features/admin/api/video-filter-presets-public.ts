'use server'

import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryQuery } from '@/lib/monitoring/with-action';

interface PublicVideoFilterPreset {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VideoFilterPresetWithShader extends PublicVideoFilterPreset {
  fragment_shader: string;
}

export async function getPublicVideoFilterPresets(
  limit?: number,
  offset?: number,
): Promise<{ data: PublicVideoFilterPreset[]; pagination: { limit: number; offset: number; total: number; totalPages: number } }> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));
  return withSentryQuery(
    "getPublicVideoFilterPresets",
    async () => serverFetch<{ data: PublicVideoFilterPreset[]; pagination: { limit: number; offset: number; total: number; totalPages: number } }>(backendUrl.resources.videoFilterPresets(params)),
  );
}

export async function getPublicVideoFilterPreset(id: string): Promise<VideoFilterPresetWithShader> {
  return withSentryQuery(
    "getPublicVideoFilterPreset",
    async () => serverFetch<VideoFilterPresetWithShader>(backendUrl.resources.videoFilterPresetById(id)),
  );
}
