'use client'

import { AdminAPI } from '@/types/admin.types'
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { type ColumnDef } from "@tanstack/react-table"
import {
  IconDotsVertical,
  IconCopy,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@repo/ui/components/animate-ui/components/radix/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/animate-ui/components/radix/dropdown-menu';
import { toast } from "@repo/ui/components/ui/sonner";
import { useState } from 'react';

type LevelFeatureUnlock = AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock;

export interface RowCallbacks {
  onEdit: (unlock: LevelFeatureUnlock) => void
  onDelete: (unlock: LevelFeatureUnlock) => void
}

function ActionsCell({ row, callbacks }: { row: { original: LevelFeatureUnlock }, callbacks?: RowCallbacks }) {
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div className="flex justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon">
              <span className="sr-only">Open menu</span>
              <IconDotsVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(row.original.id)
                toast.success('Unlock ID copied to clipboard')
              }}>
                <IconCopy />
                Copy unlock ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => callbacks?.onEdit(row.original)}>
                <IconEdit />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant='destructive'
                onSelect={(e) => {
                  e.preventDefault();
                  setAlertOpen(true);
                }}
              >
                <IconTrash />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the level feature unlock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              callbacks?.onDelete(row.original);
              setAlertOpen(false);
            }}>Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
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
      return <ActionsCell row={row} callbacks={callbacks} />;
    }
  }
]
