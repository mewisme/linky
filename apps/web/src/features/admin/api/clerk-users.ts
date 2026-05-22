'use server';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { backendUrl } from '@/lib/http/backend-url';
import { serverFetch } from '@/lib/http/server-api';
import { withSentryAction } from '@/lib/monitoring/with-action';

export async function updateClerkAdminUser(
  clerkUserId: string,
  data: AdminAPI.UpdateClerkUser.Body,
): Promise<AdminAPI.UpdateClerkUser.Response> {
  return withSentryAction('updateClerkAdminUser', async () =>
    serverFetch<AdminAPI.UpdateClerkUser.Response>(
      backendUrl.admin.clerkUserById(clerkUserId),
      { method: 'PUT', body: JSON.stringify(data) },
    ),
  );
}

export async function setClerkAdminPasswordCompromised(
  clerkUserId: string,
  data?: AdminAPI.SetClerkPasswordCompromised.Body,
): Promise<AdminAPI.SetClerkPasswordCompromised.Response> {
  return withSentryAction('setClerkAdminPasswordCompromised', async () =>
    serverFetch<AdminAPI.SetClerkPasswordCompromised.Response>(
      backendUrl.admin.clerkUserSetPasswordCompromised(clerkUserId),
      { method: 'POST', body: JSON.stringify(data ?? {}) },
    ),
  );
}

export async function unsetClerkAdminPasswordCompromised(
  clerkUserId: string,
): Promise<AdminAPI.UnsetClerkPasswordCompromised.Response> {
  return withSentryAction('unsetClerkAdminPasswordCompromised', async () =>
    serverFetch<AdminAPI.UnsetClerkPasswordCompromised.Response>(
      backendUrl.admin.clerkUserUnsetPasswordCompromised(clerkUserId),
      { method: 'POST' },
    ),
  );
}
