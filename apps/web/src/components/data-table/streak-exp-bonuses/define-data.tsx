'use client'

import { AdminAPI } from '@/types/admin.types'
import { Badge } from '@ws/ui/components/ui/badge';
import { Checkbox } from '@ws/ui/components/ui/checkbox';
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import {
  IconCopy,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';

import { ActionsButton, type ActionItem } from '@/components/common/actions-button';
import { toast } from "@ws/ui/components/ui/sonner";
import { useMemo } from 'react';

type StreakExpBonus = AdminAPI.StreakExpBonuses.StreakExpBonus;

export interface RowCallbacks {
  onEdit: (bonus: StreakExpBonus) => void
  onDelete: (bonus: StreakExpBonus) => void
}

function StreakExpBonusActionsCell({ row, callbacks }: { row: { original: StreakExpBonus }, callbacks?: RowCallbacks }) {
  const bonus = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: 'Copy bonus ID',
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(bonus.id);
        toast.success('Bonus ID copied to clipboard');
      },
    },
    {
      type: 'item',
      label: 'Edit Details',
      icon: <IconEdit className="size-4" />,
      onClick: () => callbacks?.onEdit(bonus),
    },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Delete',
      icon: <IconTrash className="size-4" />,
      onClick: () => callbacks?.onDelete(bonus),
      variant: 'destructive',
      confirmAction: {
        title: 'Are you sure?',
        description: 'This action cannot be undone. This will permanently delete the streak EXP bonus.',
        confirmLabel: 'Yes, delete',
        cancelLabel: 'No, go back',
        variant: 'destructive',
      },
    },
  ], [bonus, callbacks]);

  return <ActionsButton actions={actions} title="Actions" />;
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<StreakExpBonus>[] => [
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
    accessorKey: 'min_streak',
    header: 'Min Streak',
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.min_streak}</div>
      )
    }
  },
  {
    accessorKey: 'max_streak',
    header: 'Max Streak',
    cell: ({ row }) => {
      return (
        <div className="font-medium">{row.original.max_streak}</div>
      )
    }
  },
  {
    accessorKey: 'bonus_multiplier',
    header: 'Bonus Multiplier',
    cell: ({ row }) => {
      const multiplier = row.original.bonus_multiplier;
      const percentage = ((multiplier - 1) * 100).toFixed(0);
      return (
        <Badge variant="secondary" className="px-3 py-1 font-bold">
          {multiplier.toFixed(2)}x ({percentage}% bonus)
        </Badge>
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
      return <StreakExpBonusActionsCell row={row} callbacks={callbacks} />;
    }
  }
]
