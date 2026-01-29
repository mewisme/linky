'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/animate-ui/components/radix/alert-dialog';
import { IconRefresh, IconRefreshDot, IconTrash, IconUserPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminAPI } from '@/types/admin.types';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button } from '@repo/ui/components/ui/button';
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' });
      await refetch();
      playSound('success');
      toast.success('User deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during delete');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!token) return Promise.reject(new Error('No token'));
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deleted: false, deleted_at: null }),
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
      toast.success('User restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during restore');
    },
  });

  const embeddingSyncMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!token) return Promise.reject(new Error('No token'));
      const res = await fetch('/api/admin/embeddings/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_ids: userIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Operation failed' }));
        throw new Error(err.message || err.error || 'Operation failed');
      }
      return res.json();
    },
    onSuccess: async (data: { accepted_user_ids: string[]; skipped_user_ids: string[] }) => {
      await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' });
      await refetch();
      playSound('success');
      const accepted = data.accepted_user_ids?.length ?? 0;
      const skipped = data.skipped_user_ids?.length ?? 0;
      if (accepted > 0) toast.success(`Embedding sync scheduled for ${accepted} user(s)`);
      if (skipped > 0) toast.info(`${skipped} user(s) skipped (already up to date)`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during embedding sync');
    },
  });

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<AdminAPI.User[]>([]);

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
    onRestore: (user: AdminAPI.User) => {
      restoreMutation.mutate(user.id);
    },
    onEmbeddingSync: (user: AdminAPI.User) => {
      embeddingSyncMutation.mutate([user.id]);
    },
    onBulkDelete: (users: AdminAPI.User[]) => {
      const toDelete = users.filter((u) => !u.deleted && u.role !== 'admin');
      if (toDelete.length === 0) {
        toast.error('No eligible users to delete (admins and deleted users excluded)');
        return;
      }
      setPendingBulkDelete(toDelete);
      setBulkDeleteDialogOpen(true);
    },
    onBulkRestore: (users: AdminAPI.User[]) => {
      const toRestore = users.filter((u) => u.deleted);
      if (toRestore.length === 0) {
        toast.error('No deleted users selected');
        return;
      }
      toRestore.forEach((u) => restoreMutation.mutate(u.id));
    },
    onBulkEmbeddingSync: (users: AdminAPI.User[]) => {
      if (users.length === 0) return;
      embeddingSyncMutation.mutate(users.map((u) => u.id));
    },
  };

  const handleBulkDeleteConfirm = () => {
    pendingBulkDelete.forEach((u) => deleteMutation.mutate(u.id));
    setBulkDeleteDialogOpen(false);
    setPendingBulkDelete([]);
  };

  return (
    <AppLayout label="Users" description="Manage users">
      {isFetching && <div data-testid="admin-users-loading" />}
      {!isFetching && listData.length === 0 && <div data-testid="admin-users-empty-state" />}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingBulkDelete.length} user(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Users will be removed from Clerk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <UsersDataTable
        initialData={dataWithPresence}
        callbacks={tableCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        bulkActionsContent={(selected) => (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => tableCallbacks.onBulkDelete?.(selected)}
              disabled={selected.length === 0 || selected.every((u) => u.deleted || u.role === 'admin')}
            >
              <IconTrash className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tableCallbacks.onBulkRestore?.(selected)}
              disabled={selected.length === 0 || !selected.some((u) => u.deleted)}
            >
              <IconUserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Restore</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => tableCallbacks.onBulkEmbeddingSync?.(selected)}
              disabled={selected.length === 0 || embeddingSyncMutation.isPending}
            >
              <IconRefreshDot className="w-4 h-4" />
              <span className="hidden sm:inline">Sync embeddings</span>
            </Button>
          </div>
        )}
      />
    </AppLayout>
  );
}

