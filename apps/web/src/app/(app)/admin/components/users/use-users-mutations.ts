'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AdminAPI } from '@/types/admin.types';
import { toast } from '@ws/ui/components/ui/sonner';
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import { deleteAdminUser, restoreAdminUser, updateAdminUser } from '@/lib/actions/admin/users';
import { syncEmbeddings } from '@/lib/actions/admin/embeddings';

interface UseUsersMutationsParams {
  refetch: () => Promise<unknown>;
}

export function useUsersMutations({ refetch }: UseUsersMutationsParams) {
  const queryClient = useQueryClient();
  const { play: playSound } = useSoundWithSettings();

  const invalidateAndRefetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' });
    await refetch();
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during delete');
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
    deleteMutation,
    restoreMutation,
    embeddingSyncMutation,
  };
}
