'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route';
import { useMutation, useQueryClient } from '@ws/ui/internal-lib/react-query';

import { toast } from '@ws/ui/components/ui/sonner';
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings';
import { useTranslations } from 'next-intl';

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
      fetchFromActionRoute<AdminAPI.DeleteUser.Response>(
        `/api/admin/users/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
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
      fetchFromActionRoute<{ accepted_user_ids: string[]; skipped_user_ids: string[] }>(
        '/api/admin/embeddings/sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: userIds }),
        },
      ),
    onSuccess: async (data: { accepted_user_ids: string[]; skipped_user_ids: string[] }) => {
      await invalidateAndRefetch();
      const accepted = data.accepted_user_ids?.length ?? 0;
      const skipped = data.skipped_user_ids?.length ?? 0;
      if (accepted > 0) toast.success(t('embeddingSyncScheduled', { count: accepted }));
      if (skipped > 0) toast.info(t('embeddingSkipped', { count: skipped }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringEmbeddingSync'));
    },
  });

  const embeddingSyncAllMutation = useMutation({
    mutationFn: () =>
      fetchFromActionRoute<{ message: string }>('/api/admin/embeddings/sync-all', { method: 'POST' }),
    onSuccess: async (data: { message: string }) => {
      await invalidateAndRefetch();
      toast.success(data.message || t('embeddingSyncAllDefault'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('errorDuringEmbeddingSyncAll'));
    },
  });

  return {
    updateMutation,
    softDeleteMutation,
    softDeleteManyMutation,
    hardDeleteMutation,
    restoreMutation,
    restoreManyMutation,
    embeddingSyncMutation,
    embeddingSyncAllMutation,
  };
}
