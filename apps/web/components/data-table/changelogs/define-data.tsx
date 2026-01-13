'use client'

import { ResourcesAPI } from '@/types/resources.types'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import { IconDotsVertical, IconEdit, IconTrash, IconTrashX, IconRestore, IconCopy } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/animate-ui/components/radix/dropdown-menu'
import toast from 'react-hot-toast'

export interface RowCallbacks {
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<ResourcesAPI.Changelogs.Changelog>[] => [
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
    cell: ({ row }) => <div>{row.getValue('release_date')}</div>,
  },
  {
    accessorKey: 'created_by',
    header: 'Created By',
    cell: ({ row }) => <div>{row.getValue('created_by')}</div>,
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
    cell: ({ row }) => {
      return (
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
                  <IconDotsVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => {
                    navigator.clipboard.writeText(row.original.id)
                    toast.success('Changelog ID copied to clipboard')
                  }}>
                    <IconCopy />
                    Copy changelog ID
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </Button>
        </div>
      )
    }
  }
] 