'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { Badge } from '@ws/ui/components/ui/badge';
import { Checkbox } from '@ws/ui/components/ui/checkbox';
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import {
  IconCopy,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';

import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button';
import { toast } from "@ws/ui/components/ui/sonner";
import { useMemo } from 'react';

type LevelFeatureUnlock = AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock;

export interface RowCallbacks {
  onEdit: (unlock: LevelFeatureUnlock) => void
  onDelete: (unlock: LevelFeatureUnlock) => void
}

function LevelFeatureUnlockActionsCell({ row, callbacks }: { row: { original: LevelFeatureUnlock }, callbacks?: RowCallbacks }) {
  const unlock = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: 'Copy unlock ID',
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(unlock.id);
        toast.success('Unlock ID copied to clipboard');
      },
    },
    {
      type: 'item',
      label: 'Edit Details',
      icon: <IconEdit className="size-4" />,
      onClick: () => callbacks?.onEdit(unlock),
    },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Delete',
      icon: <IconTrash className="size-4" />,
      onClick: () => callbacks?.onDelete(unlock),
      variant: 'destructive',
      confirmAction: {
        title: 'Are you sure?',
        description: 'This action cannot be undone. This will permanently delete the level feature unlock.',
        confirmLabel: 'Yes, delete',
        cancelLabel: 'No, go back',
        variant: 'destructive',
      },
    },
  ], [unlock, callbacks]);

  return <ActionsButton actions={actions} title="Actions" />;
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<LevelFeatureUnlock>[] => [
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
    accessorKey: 'level_required',
    header: 'Level Required',
    cell: ({ row }) => {
      return (
        <Badge variant="outline" className="px-3 py-1 font-bold text-base">
          Level {row.original.level_required}
        </Badge>
      )
    }
  },
  {
    accessorKey: 'feature_key',
    header: 'Feature Key',
    cell: ({ row }) => {
      return (
        <div className="font-medium font-mono">{row.original.feature_key}</div>
      )
    }
  },
  {
    accessorKey: 'feature_payload',
    header: 'Feature Config',
    cell: ({ row }) => {
      const payload = row.original.feature_payload;
      return (
        <div className="max-w-[300px] truncate text-muted-foreground text-sm">
          {JSON.stringify(payload)}
        </div>
      )
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => {
      return (
        <div className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </div>
      )
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <LevelFeatureUnlockActionsCell row={row} callbacks={callbacks} />;
    }
  }
]
