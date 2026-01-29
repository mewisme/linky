'use client'

import { AdminAPI } from '@/types/admin.types'
import { Badge } from '@repo/ui/components/ui/badge';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { type ColumnDef } from "@tanstack/react-table"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconCopy,
  IconEdit,
  IconTrash,
  IconTrashX,
  IconRestore,
} from '@tabler/icons-react';

import { ActionsButton, type ActionItem } from '@/components/common/actions-button';
import { toast } from "@repo/ui/components/ui/sonner";
import { useMemo } from 'react';

type InterestTag = AdminAPI.InterestTags.InterestTag;

export interface RowCallbacks {
  onEdit: (tag: InterestTag) => void
  onActivate: (tag: InterestTag) => void
  onDelete: (tag: InterestTag) => void
  onDeletePermanently: (tag: InterestTag) => void
}

function InterestTagActionsCell({ row, callbacks }: { row: { original: InterestTag }, callbacks?: RowCallbacks }) {
  const tag = row.original;

  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [
      {
        type: 'item',
        label: 'Copy tag ID',
        icon: <IconCopy className="size-4" />,
        onClick: () => {
          navigator.clipboard.writeText(tag.id);
          toast.success('Tag ID copied to clipboard');
        },
      },
      {
        type: 'item',
        label: 'Edit Details',
        icon: <IconEdit className="size-4" />,
        onClick: () => callbacks?.onEdit(tag),
      },
    ];

    if (!tag.is_active) {
      items.push({
        type: 'item',
        label: 'Activate',
        icon: <IconRestore className="size-4" />,
        onClick: () => callbacks?.onActivate(tag),
      });
    }

    items.push({ type: 'separator' });

    if (tag.is_active) {
      items.push({
        type: 'item',
        label: 'Deactivate',
        icon: <IconTrash className="size-4" />,
        onClick: () => callbacks?.onDelete(tag),
        variant: 'destructive',
      });
    }

    items.push({
      type: 'item',
      label: 'Delete Permanently',
      icon: <IconTrashX className="size-4" />,
      onClick: () => callbacks?.onDeletePermanently(tag),
      variant: 'destructive',
      confirmAction: {
        title: 'Are you sure?',
        description: 'This action cannot be undone.',
        confirmLabel: 'Yes, delete',
        cancelLabel: 'No, go back',
        variant: 'destructive',
      },
    });

    return items;
  }, [tag, callbacks]);

  return <ActionsButton actions={actions} title="Actions" />;
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<InterestTag>[] => [
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
    accessorKey: 'name',
    header: 'Tag',
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-3">
          <span className="text-xl p-2 bg-muted rounded-lg">{row.original.icon || "🏷️"}</span>
          <span className="font-bold text-foreground">{row.original.name}</span>
        </div>
      )
    }
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      return (
        <Badge variant="secondary" className="px-3 py-1 font-medium">{row.original.category || "General"}</Badge>
      )
    }
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => {
      return (
        <div className="max-w-[250px] truncate text-muted-foreground italic">{row.original.description || "No description provided"}</div>
      )
    }
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      return (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.is_active ? (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
          ) : (
            <IconCircleXFilled className="fill-red-500 dark:fill-red-400" />
          )}
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      )
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return <InterestTagActionsCell row={row} callbacks={callbacks} />;
    }
  }
]
