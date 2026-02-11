'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AdminAPI } from '@/types/admin.types';
import { toast } from '@ws/ui/components/ui/sonner';
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import { apiUrl } from '@/lib/api/fetch/api-url';
import { fetchData, postData } from '@/lib/api/fetch/client-api';

interface UseUsersMutationsParams {
  token: string | null;
  refetch: () => Promise<unknown>;
}

export function useUsersMutations({ token, refetch }: UseUsersMutationsParams) {
  const queryClient = useQueryClient();
  const { play: playSound } = useSoundWithSettings();

  const invalidateAndRefetch = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' });
    await refetch();
    playSound('success');
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: Pick<AdminAPI.User, 'id' | 'role'>) => {
      if (!token) return Promise.reject(new Error('No token'));
      return fetchData<AdminAPI.User>(apiUrl.admin.userById(payload.id), {
        token,
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!token) return Promise.reject(new Error('No token'));
      return fetchData<AdminAPI.DeleteUser.Response>(apiUrl.admin.userById(id), {
        token,
        method: 'DELETE',
      });
    },
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during delete');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!token) return Promise.reject(new Error('No token'));
      return fetchData<AdminAPI.User>(apiUrl.admin.userById(id), {
        token,
        method: 'PATCH',
        body: JSON.stringify({ deleted: false, deleted_at: null }),
      });
    },
    onSuccess: async () => {
      await invalidateAndRefetch();
      toast.success('User restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during restore');
    },
  });

  const embeddingSyncMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!token) return Promise.reject(new Error('No token'));
      return postData<{ accepted_user_ids: string[]; skipped_user_ids: string[] }>(
        apiUrl.admin.embeddingsSync(),
        {
          token,
          body: { user_ids: userIds },
        }
      );
    },
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
