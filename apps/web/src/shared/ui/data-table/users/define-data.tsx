'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
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
import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button';
import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';

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
  const src = avatarUrl || '';
  const alt = firstName || lastName || '';
  return (
    <Avatar className="size-10">
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{firstName?.charAt(0) || lastName?.charAt(0) || '?'}</AvatarFallback>
    </Avatar>
  );
}, (prevProps, nextProps) => prevProps.avatarUrl === nextProps.avatarUrl);

AvatarCell.displayName = 'AvatarCell'

function UserActionsCell({ row, callbacks }: { row: { original: User }; callbacks?: RowCallbacks }) {
  const td = useTranslations('dataTable')
  const ta = useTranslations('admin')
  const user = row.original;
  const isDeleted = user.deleted === true;

  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [
      {
        type: 'item',
        label: td('users.copyUserId'),
        icon: <IconCopy className="size-4" />,
        onClick: () => {
          navigator.clipboard.writeText(user.id);
          toast.success(td('users.userIdCopied'));
        },
      },
      {
        type: 'item',
        label: td('users.copyClerkUserId'),
        icon: <IconCopy className="size-4" />,
        onClick: () => {
          navigator.clipboard.writeText(user.clerk_user_id);
          toast.success(td('users.clerkUserIdCopied'));
        },
      },
      { type: 'separator' },
      ...(user.role !== 'superadmin'
        ? [{
          type: 'radio-group' as const,
          label: ta('selectRole'),
          value: user.role,
          icon: <IconShieldLock className="size-4" />,
          onValueChange: (value: string) => callbacks?.onSelectRole?.(user, value as AdminAPI.UserRole),
          options: [
            {
              value: 'admin', label: ta('roleAdmin'),
              drawerItemLabel: ta('setAsAdmin'),
              dropdownItemLabel: ta('setAsAdmin'),
              icon: <IconShieldLock className="size-4" />,
              disabled: user.role === 'admin'
            },
            {
              value: 'member', label: ta('roleMember'),
              drawerItemLabel: ta('setAsMember'),
              dropdownItemLabel: ta('setAsMember'),
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
        label: td('users.restoreUser'),
        icon: <IconUserPlus className="size-4" />,
        onClick: () => callbacks.onRestore?.(user),
        testId: 'admin-user-restore-button',
      });
    }

    if (callbacks?.onEmbeddingSync) {
      items.push({
        type: 'item',
        label: td('users.manualEmbeddingSync'),
        icon: <IconRefresh className="size-4" />,
        onClick: () => callbacks.onEmbeddingSync?.(user),
        testId: 'admin-user-embedding-sync-button',
      });
    }

    if (callbacks?.onCompareEmbeddings || callbacks?.onFindSimilarUsers) {
      items.push({ type: 'separator' });
      items.push({ type: 'label', label: td('users.aiEmbeddings') });
      if (callbacks?.onCompareEmbeddings) {
        items.push({
          type: 'item',
          label: td('users.compareEmbeddings'),
          icon: <IconArrowsExchange className="size-4" />,
          onClick: () => callbacks.onCompareEmbeddings?.(user),
          testId: 'admin-user-compare-embeddings-button',
        });
      }
      if (callbacks?.onFindSimilarUsers) {
        items.push({
          type: 'item',
          label: td('users.findSimilarUsers'),
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
          label: td('users.softDelete'),
          icon: <IconTrash className="size-4" />,
          onClick: () => callbacks?.onSoftDelete?.(user),
          testId: 'admin-user-soft-delete-button',
          confirmAction: {
            title: ta('softDeleteUserTitle'),
            description: ta('softDeleteUserDescription'),
            confirmLabel: ta('softDeleteUserConfirm'),
            cancelLabel: td('confirm.cancel'),
            variant: 'default',
          },
        });
      }
      if (callbacks?.currentUserRole === 'superadmin' && callbacks?.onHardDelete) {
        items.push({
          type: 'item',
          label: td('users.hardDelete'),
          icon: <IconTrash className="size-4" />,
          onClick: () => callbacks?.onHardDelete?.(user),
          variant: 'destructive',
          testId: 'admin-user-hard-delete-button',
          confirmAction: {
            title: ta('hardDeleteUserTitle'),
            description: ta('hardDeleteUserDescription'),
            confirmLabel: ta('hardDeleteUserConfirm'),
            cancelLabel: td('confirm.cancel'),
            variant: 'destructive',
          },
        });
      }
    }

    return items;
  }, [user, isDeleted, callbacks, td, ta]);

  return <ActionsButton actions={actions} title={td('common.actions')} />;
}

export function useUsersColumns(callbacks?: RowCallbacks): ColumnDef<User>[] {
  const td = useTranslations('dataTable')
  const ta = useTranslations('admin')
  return useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={td('common.selectAllAria')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={td('common.selectRowAria')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "avatar_url",
      header: td('users.columnAvatar'),
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
      header: td('users.columnId'),
      cell: ({ row }) => <div>{row.getValue("id")}</div>,

    },
    {
      accessorKey: "clerk_user_id",
      header: td('users.columnClerkUserId'),
      cell: ({ row }) => <div>{row.getValue("clerk_user_id")}</div>,
    },
    {
      accessorKey: "email",
      header: td('users.columnEmail'),
      cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "first_name",
      header: td('users.firstName'),
      cell: ({ row }) => <div>{row.getValue("first_name")}</div>,
    },
    {
      accessorKey: "last_name",
      header: td('users.lastName'),
      cell: ({ row }) => <div>{row.getValue("last_name")}</div>,
    },
    {
      accessorKey: "role",
      header: td('users.role'),
      cell: ({ row }) => {
        const role = row.getValue("role") as AdminAPI.UserRole;
        if (role === 'superadmin') {
          return (
            <Badge variant="secondary" className="font-mono text-xs">
              {ta('superadminProtected')}
            </Badge>
          );
        }
        return <div>{role}</div>;
      },
    },
    {
      accessorKey: "level",
      header: td('users.level'),
      cell: ({ row }) => <div>{row.original.level ?? 1}</div>,
    },
    {
      accessorKey: "deleted",
      header: td('users.deleted'),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {!row.original.deleted ? (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
          ) : (
            <IconCircleXFilled className="fill-red-500 dark:fill-red-400" />
          )}
          {row.original.deleted ? td('users.deletedBadge') : td('users.activeBadge')}
        </Badge>
      ),
    },
    {
      accessorKey: "details.bio",
      id: "bio",
      header: td('users.bio'),
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.details?.bio ?? undefined}>
          {row.original.details?.bio ?? "-"}
        </div>
      ),
    },
    {
      accessorKey: "interest_tag_names",
      id: "interest_tag_names",
      header: td('users.interestTags'),
      cell: ({ row }) => {
        const interestTagNames = row.original.interest_tag_names ?? [];
        return (
          <div>
            {interestTagNames.length === 0 && <Badge variant="secondary" className="text-center">{td('users.noTag')}</Badge>}
            {interestTagNames.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Badge variant="secondary" className="text-xs text-center">
                    {td('users.tagsCount', { count: interestTagNames.length })}
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
      header: td('users.embedding'),
      cell: ({ row }) => (
        <div>{row.original.embedding ? td('users.synced') : td('users.none')}</div>
      ),
    },
    {
      accessorKey: "embedding.updated_at",
      id: "embedding_updated_at",
      header: td('users.embeddingUpdated'),
      cell: ({ row }) => (
        <div>{row.original.embedding?.updated_at ?? "-"}</div>
      ),
    },
    {
      accessorKey: "presence",
      header: td('users.presence'),
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
      header: td('users.createdAt'),
      cell: ({ row }) => <div>{row.getValue("created_at")}</div>,
    },
    {
      accessorKey: "updated_at",
      header: td('users.updatedAt'),
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
  ], [callbacks, td, ta])
}
