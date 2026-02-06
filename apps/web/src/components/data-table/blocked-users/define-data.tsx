'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import { type ColumnDef } from "@tanstack/react-table";
import { IconUserOff } from "@tabler/icons-react";
import { ActionsButton, type ActionItem } from "@/components/common/actions-button";
import { useMemo } from "react";
import type { BlockedUserWithDetails } from "@/types/notifications.types";

export interface RowCallbacks {
  onUnblock?: (user: BlockedUserWithDetails) => void;
}

function BlockedUserActionsCell({ row, callbacks }: { row: { original: BlockedUserWithDetails }; callbacks?: RowCallbacks }) {
  const user = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: 'Unblock user',
      icon: <IconUserOff className="size-4" />,
      onClick: () => callbacks?.onUnblock?.(user),
      variant: 'destructive',
      confirmAction: {
        title: 'Unblock User',
        description: `Are you sure you want to unblock ${user.first_name || "this user"}? They will be able to match with you again.`,
        confirmLabel: 'Unblock',
        variant: 'destructive',
      },
    },
  ], [user, callbacks]);

  return <ActionsButton actions={actions} title="Actions" className="flex justify-end" />;
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<BlockedUserWithDetails>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className='justify-center flex'
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
    accessorKey: "blocked_user",
    header: "User",
    cell: ({ row }) => {
      const name = `${row.original.first_name || ""} ${row.original.last_name || ""}`.trim() || "Unknown";
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
    header: "Blocked On",
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
]
