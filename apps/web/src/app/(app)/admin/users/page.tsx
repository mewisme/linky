'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminAPI } from '@/types/admin.types';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button } from '@repo/ui/components/ui/button';
import { IconRefresh } from '@tabler/icons-react';
import { UsersDataTable } from '@/components/data-table/users/data-table';
import { toast } from '@repo/ui/components/ui/sonner';
import { useSocket } from '@/hooks/socket/use-socket';
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import { useUserContext } from '@/components/providers/user/user-provider';

export default function ListUsersPage() {
  const { state } = useUserContext();
  const { adminSocket } = useSocket();
  const { play: playSound } = useSoundWithSettings();
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchToken = async () => {
      const t = await state.getToken();
      setToken(t);
    };
    fetchToken();
  }, [state]);

  const { data: users, isFetching, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?all=true`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json() as Promise<AdminAPI.GetUsers.Response>;
    },
    enabled: !!token,
  });

  const listData = users?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: async (payload: Pick<AdminAPI.User, 'id' | 'role'>) => {
      if (!token) return Promise.reject(new Error('No token'));
      const res = await fetch(`/api/admin/users/${payload.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Operation failed' }));
        throw new Error(err.message || err.error || 'Operation failed');
      }
      return res.json() as Promise<AdminAPI.User>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' });
      await refetch();
      playSound('success');
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during update');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!token) return Promise.reject(new Error('No token'));
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Operation failed' }));
        throw new Error(err.message || err.error || 'Operation failed');
      }
      return res.json() as Promise<AdminAPI.DeleteUser.Response>;
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const prev = queryClient.getQueryData<AdminAPI.GetUsers.Response>(['users']);
      if (prev?.data) {
        queryClient.setQueryData<AdminAPI.GetUsers.Response>(['users'], {
          ...prev,
          data: prev.data.filter((u) => u.id !== id),
        });
      }
      return { prev };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' });
      await refetch();
      playSound('success');
      toast.success('User deleted successfully');
    },
    onError: (error: Error, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['users'], context.prev);
      }
      toast.error(error.message || 'An error occurred during delete');
    },
  });

  const [presenceMap, setPresenceMap] = useState<Record<string, AdminAPI.PresenceState>>({});
  useEffect(() => {
    if (!adminSocket) return;
    const onPresenceUpdate = (update: { userId: string; state: string; updatedAt: number }) => {
      setPresenceMap((m) => {
        const next = update.state as AdminAPI.PresenceState;
        if (m[update.userId] === next) return m;
        return { ...m, [update.userId]: next };
      });
    };
    adminSocket.on('presence_update', onPresenceUpdate);
    return () => {
      adminSocket.off('presence_update', onPresenceUpdate);
    };
  }, [adminSocket]);

  const dataWithPresence = listData.map((u) => ({
    ...u,
    presence: presenceMap[u.clerk_user_id] ?? u.presence ?? 'offline',
  }));

  const tableCallbacks = {
    onSelectRole: (user: AdminAPI.User, role: AdminAPI.UserRole) => {
      updateMutation.mutate({ id: user.id, role });
    },
    onDelete: (user: AdminAPI.User) => {
      deleteMutation.mutate(user.id);
    },
  };

  return (
    <AppLayout label="Users" description="Manage users">
      <UsersDataTable
        initialData={dataWithPresence}
        callbacks={tableCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />
    </AppLayout>
  );
}

