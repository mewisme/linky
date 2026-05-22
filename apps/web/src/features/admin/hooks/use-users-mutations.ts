'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route';
import { useMutation, useQueryClient } from '@ws/ui/internal-lib/react-query';

import { toast } from '@ws/ui/components/ui/sonner';
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings';
import { useTranslations } from 'next-intl';

export interface SetClerkPasswordPayload {
  clerkUserId: string;
  password: string;
  skipPasswordChecks?: boolean;
  signOutOfOtherSessions?: boolean;
  setPasswordCompromised?: boolean;
}

export interface SetClerkPasswordCompromisedPayload {
  clerkUserId: string;
  revokeAllSessions?: boolean;
}

export interface UnsetClerkPasswordCompromisedPayload {
  clerkUserId: string;
}

export function useUsersMutations() {
  const t = useTranslations('admin');
  const queryClient = useQueryClient();
  const { play: playSound } = useSoundWithSettings();

  const invalidateAndRefetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' });
    playSound('success');
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Pick<AdminAPI.User, 'id' | 'role'>) =>
      fetchFromActionRoute<AdminAPI.UpdateUser.Response>(`/api/admin/users/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: payload.role }),
      }),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success(t('userUpdated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringUpdate'));
    },
  });

  const setClerkPasswordMutation = useMutation({
    mutationFn: (payload: SetClerkPasswordPayload) =>
      fetchFromActionRoute<AdminAPI.UpdateClerkUser.Response>(
        `/api/admin/users/clerk/${encodeURIComponent(payload.clerkUserId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: payload.password,
            skip_password_checks: payload.skipPasswordChecks ?? false,
            sign_out_of_other_sessions: payload.signOutOfOtherSessions ?? true,
          }),
        },
      ),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success(t('clerkPasswordUpdated'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringClerkPasswordUpdate'));
    },
  });

  const setClerkPasswordCompromisedMutation = useMutation({
    mutationFn: (payload: SetClerkPasswordCompromisedPayload) =>
      fetchFromActionRoute<AdminAPI.SetClerkPasswordCompromised.Response>(
        `/api/admin/users/clerk/${encodeURIComponent(payload.clerkUserId)}/password/set-compromised`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revoke_all_sessions: payload.revokeAllSessions ?? true,
          }),
        },
      ),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success(t('clerkPasswordCompromisedSet'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringClerkPasswordCompromised'));
    },
  });

  const unsetClerkPasswordCompromisedMutation = useMutation({
    mutationFn: (payload: UnsetClerkPasswordCompromisedPayload) =>
      fetchFromActionRoute<AdminAPI.UnsetClerkPasswordCompromised.Response>(
        `/api/admin/users/clerk/${encodeURIComponent(payload.clerkUserId)}/password/unset-compromised`,
        { method: 'POST' },
      ),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success(t('clerkPasswordCompromisedUnset'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringClerkPasswordCompromisedUnset'));
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchFromActionRoute<AdminAPI.PatchUser.Response>(
        `/api/admin/users/${encodeURIComponent(id)}/soft-delete`,
        { method: 'POST' },
      ),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success(t('userSoftDeleted'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringSoftDelete'));
    },
  });

  const softDeleteManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetchFromActionRoute<AdminAPI.PatchUsersBatch.Response>('/api/admin/users/batch/soft-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return ids.length;
    },
    onSuccess: async (count) => {
      await invalidateAndRefetch();
      toast.success(
        count === 1 ? t('userSoftDeleted') : t('usersSoftDeletedCount', { count })
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringBulkSoftDelete'));
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchFromActionRoute<{ deleted: number }>(
        '/api/admin/users/batch',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        },
      ),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success(t('userPermDeleted'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringHardDelete'));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) =>
      fetchFromActionRoute<AdminAPI.PatchUser.Response>(
        `/api/admin/users/${encodeURIComponent(id)}/restore`,
        { method: 'POST' },
      ),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success(t('userRestored'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringRestore'));
    },
  });

  const restoreManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetchFromActionRoute<AdminAPI.PatchUsersBatch.Response>('/api/admin/users/batch/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      return ids.length;
    },
    onSuccess: async (count) => {
      await invalidateAndRefetch();
      toast.success(
        count === 1 ? t('userRestored') : t('usersRestoredCount', { count })
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringBulkRestore'));
    },
  });

  const embeddingSyncMutation = useMutation({
    mutationFn: (userIds: string[]) =>
      fetchFromActionRoute<{ enqueued: number }>(
        '/api/admin/embeddings/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: userIds }),
        },
      ),
    onSuccess: async (data: { enqueued: number }) => {
      await invalidateAndRefetch();
      const enqueued = data.enqueued ?? 0;
      if (enqueued > 0) toast.success(t('embeddingSyncScheduled', { count: enqueued }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringEmbeddingSync'));
    },
  });

  const embeddingSyncAllMutation = useMutation({
    mutationFn: () =>
      fetchFromActionRoute<{ scheduled: number }>('/api/admin/embeddings/sync-all', { method: 'POST' }),
    onSuccess: async (data: { scheduled: number }) => {
      await invalidateAndRefetch();
      toast.success(t('embeddingSyncAllDefault'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringEmbeddingSyncAll'));
    },
  });

  return {
    updateMutation,
    setClerkPasswordMutation,
    setClerkPasswordCompromisedMutation,
    unsetClerkPasswordCompromisedMutation,
    softDeleteMutation,
    softDeleteManyMutation,
    hardDeleteMutation,
    restoreMutation,
    restoreManyMutation,
    embeddingSyncMutation,
    embeddingSyncAllMutation,
  };
}
