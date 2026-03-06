'use client';

import {
  hardDeleteAdminUser,
  hardDeleteAdminUsers,
  restoreAdminUser,
  restoreAdminUsers,
  softDeleteAdminUser,
  softDeleteAdminUsers,
  updateAdminUser,
} from '@/features/admin/api/users';
import { useMutation, useQueryClient } from '@ws/ui/internal-lib/react-query';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { syncEmbeddings } from '@/features/admin/api/embeddings';
import { toast } from '@ws/ui/components/ui/sonner';
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings';

export function useUsersMutations() {
  const queryClient = useQueryClient();
  const { play: playSound } = useSoundWithSettings();

  const invalidateAndRefetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' });
    playSound('success');
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Pick<AdminAPI.User, 'id' | 'role'>) =>
      updateAdminUser(payload.id, { role: payload.role }),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during update');
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => softDeleteAdminUser(id),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success('User soft deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during soft delete');
    },
  });

  const softDeleteManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await softDeleteAdminUsers(ids);
      return ids.length;
    },
    onSuccess: async (count) => {
      await invalidateAndRefetch();
      toast.success(
        count === 1 ? 'User soft deleted successfully' : `${count} users soft deleted successfully`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during bulk soft delete');
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => hardDeleteAdminUser(id),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success('User permanently deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during hard delete');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreAdminUser(id),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success('User restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during restore');
    },
  });

  const restoreManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await restoreAdminUsers(ids);
      return ids.length;
    },
    onSuccess: async (count) => {
      await invalidateAndRefetch();
      toast.success(
        count === 1 ? 'User restored successfully' : `${count} users restored successfully`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during bulk restore');
    },
  });

  const embeddingSyncMutation = useMutation({
    mutationFn: (userIds: string[]) => syncEmbeddings(userIds),
    onSuccess: async (data: { accepted_user_ids: string[]; skipped_user_ids: string[] }) => {
      await invalidateAndRefetch();
      const accepted = data.accepted_user_ids?.length ?? 0;
      const skipped = data.skipped_user_ids?.length ?? 0;
      if (accepted > 0) toast.success(`Embedding sync scheduled for ${accepted} user(s)`);
      if (skipped > 0) toast.info(`${skipped} user(s) skipped (already up to date)`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during embedding sync');
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
  };
}
