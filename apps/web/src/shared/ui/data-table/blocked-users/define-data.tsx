'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import { Checkbox } from "@ws/ui/components/ui/checkbox";
import { type ColumnDef } from "@ws/ui/internal-lib/react-table";
import { IconUserOff } from "@tabler/icons-react";
import { ActionsButton, type ActionItem } from "@/shared/ui/common/actions-button";
import { useMemo } from "react";
import type { BlockedUserWithDetails } from "@/entities/notification/types/notifications.types";
import { useTranslations } from "next-intl";

export interface RowCallbacks {
  onUnblock?: (user: BlockedUserWithDetails) => void;
}

function BlockedUserActionsCell({ row, callbacks }: { row: { original: BlockedUserWithDetails }; callbacks?: RowCallbacks }) {
  const t = useTranslations('dataTable')
  const user = row.original;
  const displayName = `${user.first_name || ""} ${user.last_name || ""}`.trim();

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: t('blockedUsers.unblockUser'),
      icon: <IconUserOff className="size-4" />,
      onClick: () => callbacks?.onUnblock?.(user),
      variant: 'destructive',
      confirmAction: {
        title: t('blockedUsers.unblockTitle'),
        description: t('blockedUsers.unblockDescription', {
          name: displayName || t('common.unknownUser'),
        }),
        confirmLabel: t('blockedUsers.unblockConfirm'),
        variant: 'destructive',
      },
    },
  ], [user, callbacks, t, displayName]);

  return <ActionsButton actions={actions} title={t('common.actions')} className="flex justify-end" />;
}

export function useBlockedUsersColumns(callbacks?: RowCallbacks): ColumnDef<BlockedUserWithDetails>[] {
  const t = useTranslations('dataTable')
  return useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('common.selectAllAria')}
          className='justify-center flex'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('common.selectRowAria')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "blocked_user",
      header: t('blockedUsers.user'),
      cell: ({ row }) => {
        const name = `${row.original.first_name || ""} ${row.original.last_name || ""}`.trim() || t('common.unknownUser');
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={row.original.avatar_url || ""} alt={name} />
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{name}</span>
          </div>
        )
      }
    },
    {
      accessorKey: "blocked_at",
      header: t('blockedUsers.blockedOn'),
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.blocked_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )
      }
    },
    {
      id: "actions",
      cell: ({ row }) => <BlockedUserActionsCell row={row} callbacks={callbacks} />,
      enableHiding: false,
      enableSorting: false,
    }
  ], [callbacks, t])
}
