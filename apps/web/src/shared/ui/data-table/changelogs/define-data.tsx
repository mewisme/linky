'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import { Checkbox } from '@ws/ui/components/ui/checkbox'
import { IconCopy } from '@tabler/icons-react'
import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button'
import { toast } from "@ws/ui/components/ui/sonner"
import { useMemo } from 'react'

export type RowCallbacks = Record<string, unknown>;

function ChangelogsActionsCell({ row }: { row: { original: AdminAPI.Changelogs.Changelog } }) {
  const changelog = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: 'Copy changelog ID',
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(changelog.id);
        toast.success('Changelog ID copied to clipboard');
      },
    },
  ], [changelog]);

  return <ActionsButton actions={actions} title="Actions" className="flex justify-end" />;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- API compatibility
export const columns = (_callbacks?: RowCallbacks): ColumnDef<AdminAPI.Changelogs.Changelog>[] => [
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
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <div>{row.getValue('id')}</div>,
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => <div>{row.getValue('version')}</div>,
  },
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => <div>{row.getValue('title')}</div>,
  },
  {
    accessorKey: 'release_date',
    header: 'Release Date',
    cell: ({ row }) => <div>{new Date(row.original.release_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>,
  },
  {
    accessorKey: 'created_by',
    header: 'Created By',
    cell: ({ row }) => <div>{row.original.created_by.first_name} {row.original.created_by.last_name}</div>,
  },
  {
    accessorKey: 'is_published',
    header: 'Published',
    cell: ({ row }) => <div>{row.getValue('is_published') ? 'Yes' : 'No'}</div>,
  },
  {
    accessorKey: 'order',
    header: 'Order',
    cell: ({ row }) => <div>{row.getValue('order')}</div>,
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => <div>{row.getValue('created_at')}</div>,
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated At',
    cell: ({ row }) => <div>{row.getValue('updated_at')}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => <ChangelogsActionsCell row={row} />,
  }
] 