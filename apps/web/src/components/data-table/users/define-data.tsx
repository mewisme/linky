'use client';

import type { AdminAPI } from '@/types/admin.types';
import { Checkbox } from '@ws/ui/components/ui/checkbox';
import { Badge } from '@ws/ui/components/ui/badge';
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import { IconArrowsExchange, IconCircleCheckFilled, IconCircleXFilled, IconTrash, IconRefresh, IconUserPlus, IconUsersGroup, IconShieldLock, IconCopy } from '@tabler/icons-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@ws/ui/components/animate-ui/components/radix/popover';
import { toast } from "@ws/ui/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from '@ws/ui/components/ui/avatar';
import { Status, StatusIndicator, StatusLabel } from "@ws/ui/components/kibo-ui/status";
import { ActionsButton, type ActionItem } from '@/components/common/actions-button';
import { memo, useMemo } from 'react';

export interface RowCallbacks {
  currentUserRole?: AdminAPI.UserRole
  onSelectRole?: (user: AdminAPI.User, role: AdminAPI.UserRole) => void
  onSoftDelete?: (user: AdminAPI.User) => void
  onHardDelete?: (user: AdminAPI.User) => void
  onRestore?: (user: AdminAPI.User) => void
  onEmbeddingSync?: (user: AdminAPI.User) => void
  onCompareEmbeddings?: (user: AdminAPI.User) => void
  onFindSimilarUsers?: (user: AdminAPI.User) => void
  onBulkDelete?: (users: AdminAPI.User[]) => void
  onBulkRestore?: (users: AdminAPI.User[]) => void
  onBulkEmbeddingSync?: (users: AdminAPI.User[]) => void
}

type User = AdminAPI.User;

const AvatarCell = memo(({ avatarUrl, firstName, lastName }: { avatarUrl: string | null | undefined; firstName?: string | null; lastName?: string | null }) => {
  return (
    <Avatar>
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback>{firstName?.charAt(0) || lastName?.charAt(0) || '?'}</AvatarFallback>
    </Avatar>
  )
}, (prevProps, nextProps) => {
  return prevProps.avatarUrl === nextProps.avatarUrl &&
    prevProps.firstName === nextProps.firstName &&
    prevProps.lastName === nextProps.lastName
})

AvatarCell.displayName = 'AvatarCell'

function UserActionsCell({ row, callbacks }: { row: { original: User }; callbacks?: RowCallbacks }) {
  const user = row.original;
  const isDeleted = user.deleted === true;

  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [
      {
        type: 'item',
        label: 'Copy user ID',
        icon: <IconCopy className="size-4" />,
        onClick: () => {
          navigator.clipboard.writeText(user.id);
          toast.success('User ID copied to clipboard');
        },
      },
      {
        type: 'item',
        label: 'Copy Clerk user ID',
        icon: <IconCopy className="size-4" />,
        onClick: () => {
          navigator.clipboard.writeText(user.clerk_user_id);
          toast.success('Clerk user ID copied to clipboard');
        },
      },
      { type: 'separator' },
      ...(user.role !== 'superadmin'
        ? [{
            type: 'radio-group' as const,
            label: 'Select role',
            value: user.role,
            icon: <IconShieldLock className="size-4" />,
            onValueChange: (value) => callbacks?.onSelectRole?.(user, value as AdminAPI.UserRole),
            options: [
              {
                value: 'admin', label: 'Admin',
                drawerItemLabel: 'Set as Admin',
                dropdownItemLabel: 'Set as Admin',
                icon: <IconShieldLock className="size-4" />,
                disabled: user.role === 'admin'
              },
              {
                value: 'member', label: 'Member',
                drawerItemLabel: 'Set as Member',
                dropdownItemLabel: 'Set as Member',
                icon: <IconUserPlus className="size-4" />,
                disabled: user.role === 'member'
              },
            ],
          }]
        : []),
      { type: 'separator' },
    ];

    if (user.role !== 'superadmin' && isDeleted && callbacks?.onRestore) {
      items.push({
        type: 'item',
        label: 'Restore user',
        icon: <IconUserPlus className="size-4" />,
        onClick: () => callbacks.onRestore?.(user),
        testId: 'admin-user-restore-button',
      });
    }

    if (callbacks?.onEmbeddingSync) {
      items.push({
        type: 'item',
        label: 'Manual embedding sync',
        icon: <IconRefresh className="size-4" />,
        onClick: () => callbacks.onEmbeddingSync?.(user),
        testId: 'admin-user-embedding-sync-button',
      });
    }

    if (callbacks?.onCompareEmbeddings || callbacks?.onFindSimilarUsers) {
      items.push({ type: 'separator' });
      items.push({ type: 'label', label: 'AI / Embeddings' });
      if (callbacks?.onCompareEmbeddings) {
        items.push({
          type: 'item',
          label: 'Compare embeddings',
          icon: <IconArrowsExchange className="size-4" />,
          onClick: () => callbacks.onCompareEmbeddings?.(user),
          testId: 'admin-user-compare-embeddings-button',
        });
      }
      if (callbacks?.onFindSimilarUsers) {
        items.push({
          type: 'item',
          label: 'Find similar users',
          icon: <IconUsersGroup className="size-4" />,
          onClick: () => callbacks.onFindSimilarUsers?.(user),
          testId: 'admin-user-find-similar-button',
        });
      }
    }

    if (!isDeleted && user.role !== 'superadmin') {
      items.push({ type: 'separator' });
      if (callbacks?.onSoftDelete) {
        items.push({
          type: 'item',
          label: 'Soft Delete',
          icon: <IconTrash className="size-4" />,
          onClick: () => callbacks.onSoftDelete(user),
          testId: 'admin-user-soft-delete-button',
          confirmAction: {
            title: 'Soft delete user?',
            description: 'The user will be marked as deleted and hidden from active lists. They can be restored later.',
            confirmLabel: 'Yes, soft delete',
            cancelLabel: 'Cancel',
            variant: 'default',
          },
        });
      }
      if (callbacks?.currentUserRole === 'superadmin' && callbacks?.onHardDelete) {
        items.push({
          type: 'item',
          label: 'Hard Delete',
          icon: <IconTrash className="size-4" />,
          onClick: () => callbacks.onHardDelete(user),
          variant: 'destructive',
          testId: 'admin-user-hard-delete-button',
          confirmAction: {
            title: 'Permanently delete user?',
            description: 'This will remove the user from the database and Clerk. This action cannot be undone.',
            confirmLabel: 'Yes, delete permanently',
            cancelLabel: 'Cancel',
            variant: 'destructive',
          },
        });
      }
    }

    return items;
  }, [user, isDeleted, callbacks]);

  return <ActionsButton actions={actions} title="Actions" />;
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<User>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "avatar_url",
    header: "Avatar",
    cell: ({ row }) => {
      const avatarUrl = row.getValue("avatar_url") as string | null | undefined
      return (
        <AvatarCell
          avatarUrl={avatarUrl}
          firstName={row.original.first_name}
          lastName={row.original.last_name}
        />
      )
    },
  },
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div>{row.getValue("id")}</div>,

  },
  {
    accessorKey: "clerk_user_id",
    header: "Clerk User ID",
    cell: ({ row }) => <div>{row.getValue("clerk_user_id")}</div>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "first_name",
    header: "First Name",
    cell: ({ row }) => <div>{row.getValue("first_name")}</div>,
  },
  {
    accessorKey: "last_name",
    header: "Last Name",
    cell: ({ row }) => <div>{row.getValue("last_name")}</div>,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as AdminAPI.UserRole;
      if (role === 'superadmin') {
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            Superadmin (protected)
          </Badge>
        );
      }
      return <div>{role}</div>;
    },
  },
  {
    accessorKey: "level",
    header: "Level",
    cell: ({ row }) => <div>{row.original.level ?? 1}</div>,
  },
  {
    accessorKey: "deleted",
    header: "Deleted",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {!row.original.deleted ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconCircleXFilled className="fill-red-500 dark:fill-red-400" />
        )}
        {row.original.deleted ? "Deleted" : "Active"}
      </Badge>
    ),
  },
  {
    accessorKey: "details.bio",
    id: "bio",
    header: "Bio",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.original.details?.bio ?? undefined}>
        {row.original.details?.bio ?? "-"}
      </div>
    ),
  },
  {
    accessorKey: "interest_tag_names",
    id: "interest_tag_names",
    header: "Interest Tags",
    cell: ({ row }) => {
      const interestTagNames = row.original.interest_tag_names ?? [];
      return (
        <div>
          {interestTagNames.length === 0 && <Badge variant="secondary" className="text-center">No tag</Badge>}
          {interestTagNames.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Badge variant="secondary" className="text-xs text-center">
                  {interestTagNames.length} tags
                </Badge>
              </PopoverTrigger>
              <PopoverContent>
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {interestTagNames.map((name) => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "embedding",
    id: "embedding_status",
    header: "Embedding",
    cell: ({ row }) => (
      <div>{row.original.embedding ? "Synced" : "None"}</div>
    ),
  },
  {
    accessorKey: "embedding.updated_at",
    id: "embedding_updated_at",
    header: "Embedding Updated",
    cell: ({ row }) => (
      <div>{row.original.embedding?.updated_at ?? "-"}</div>
    ),
  },
  {
    accessorKey: "presence",
    header: "Presence",
    cell: ({ row }) => {
      const presence = row.getValue("presence") as AdminAPI.PresenceState;
      return (
        <div>
          <Status status={presence}>
            <StatusIndicator />
            <StatusLabel />
          </Status>
        </div>
      );
    },
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => <div>{row.getValue("created_at")}</div>,
  },
  {
    accessorKey: "updated_at",
    header: "Updated At",
    cell: ({ row }) => <div>{row.getValue("updated_at")}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <UserActionsCell row={row} callbacks={callbacks} />
    ),
    enableHiding: false,
    enableSorting: false,
  }
]