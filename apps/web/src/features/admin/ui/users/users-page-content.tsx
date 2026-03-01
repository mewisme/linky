'use client';

import { useState } from 'react';
import { IconRefresh, IconRefreshDot, IconTrash, IconUserPlus } from '@tabler/icons-react';
import { toast } from '@ws/ui/components/ui/sonner';
import dynamic from 'next/dynamic';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { AppLayout } from '@/shared/ui/layouts/app-layout';
import { Button } from '@ws/ui/components/ui/button';
import { useUserContext } from '@/providers/user/user-provider';

const UsersDataTable = dynamic(
  () => import('@/shared/ui/data-table/users/data-table').then(mod => ({ default: mod.UsersDataTable })),
  { ssr: false }
);

import { useUsersQuery } from '@/features/admin/hooks/use-users-query';
import { useUsersMutations } from '@/features/admin/hooks/use-users-mutations';
import { useUsersPresence } from '@/features/admin/hooks/use-users-presence';
import { BulkDeleteDialog } from './bulk-delete-dialog';
import { BulkActions, type BulkAction } from './bulk-actions';
import { CompareEmbeddingsModal, FindSimilarUsersModal } from './embedding-actions';
import { isAdmin } from '@/shared/utils/roles';

interface UsersPageContentProps {
  initialData?: AdminAPI.GetUsers.Response;
}

export function UsersPageContent({ initialData }: UsersPageContentProps = {}) {
  const { store: { user: currentUser } } = useUserContext();
  const { users, isFetching, refetch } = useUsersQuery({ initialData });
  const dataWithPresence = useUsersPresence(users);
  const {
    updateMutation,
    softDeleteMutation,
    hardDeleteMutation,
    restoreMutation,
    embeddingSyncMutation,
  } = useUsersMutations({ refetch });

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<AdminAPI.User[]>([]);
  const [compareModalUser, setCompareModalUser] = useState<AdminAPI.User | null>(null);
  const [findSimilarModalUser, setFindSimilarModalUser] = useState<AdminAPI.User | null>(null);

  const tableCallbacks = {
    currentUserRole: currentUser?.role,
    onSelectRole: (user: AdminAPI.User, role: AdminAPI.UserRole) => {
      updateMutation.mutate({ id: user.id, role });
    },
    onSoftDelete: (user: AdminAPI.User) => {
      softDeleteMutation.mutate(user.id);
    },
    onHardDelete: (user: AdminAPI.User) => {
      hardDeleteMutation.mutate(user.id);
    },
    onRestore: (user: AdminAPI.User) => {
      restoreMutation.mutate(user.id);
    },
    onEmbeddingSync: (user: AdminAPI.User) => {
      embeddingSyncMutation.mutate([user.id]);
    },
    onCompareEmbeddings: (user: AdminAPI.User) => {
      setCompareModalUser(user);
    },
    onFindSimilarUsers: (user: AdminAPI.User) => {
      setFindSimilarModalUser(user);
    },
    onBulkDelete: (users: AdminAPI.User[]) => {
      const toDelete = users.filter((u) => !u.deleted && !isAdmin(u.role));
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
    pendingBulkDelete.forEach((u) => softDeleteMutation.mutate(u.id));
    setBulkDeleteDialogOpen(false);
    setPendingBulkDelete([]);
  };

  const bulkActions: BulkAction[] = [
    {
      label: 'Delete',
      icon: IconTrash,
      onClick: (selected) => tableCallbacks.onBulkDelete?.(selected),
    },
    {
      label: 'Restore',
      icon: IconUserPlus,
      onClick: (selected) => tableCallbacks.onBulkRestore?.(selected),
    },
    {
      label: 'Sync embeddings',
      icon: IconRefreshDot,
      onClick: (selected) => tableCallbacks.onBulkEmbeddingSync?.(selected),
    },
  ];

  return (
    <AppLayout label="Users" description="Manage users">
      {isFetching && <div data-testid="admin-users-loading" />}
      {!isFetching && users.length === 0 && <div data-testid="admin-users-empty-state" />}
      <BulkDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        pendingUsers={pendingBulkDelete}
        onConfirm={handleBulkDeleteConfirm}
      />
      {compareModalUser && (
        <CompareEmbeddingsModal
          open={!!compareModalUser}
          onOpenChange={(open) => !open && setCompareModalUser(null)}
          user={compareModalUser}
          users={dataWithPresence}
        />
      )}
      {findSimilarModalUser && (
        <FindSimilarUsersModal
          open={!!findSimilarModalUser}
          onOpenChange={(open) => !open && setFindSimilarModalUser(null)}
          user={findSimilarModalUser}
          users={dataWithPresence}
        />
      )}
      <UsersDataTable
        initialData={dataWithPresence}
        callbacks={tableCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        bulkActionsContent={(selected) => (
          <BulkActions bulkActions={bulkActions} selected={selected} />
        )}
      />
    </AppLayout>
  );
}
