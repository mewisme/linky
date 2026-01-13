'use client'

import { AdminAPI } from '@/types/admin.types'
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { type ColumnDef } from "@tanstack/react-table"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconDotsVertical,
  IconCopy,
  IconEdit,
  IconTrash,
  IconTrashX,
  IconRestore,
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
import toast from 'react-hot-toast';
import { useState } from 'react';

type InterestTag = AdminAPI.InterestTags.InterestTag;

export interface RowCallbacks {
  onEdit: (tag: InterestTag) => void
  onActivate: (tag: InterestTag) => void
  onDelete: (tag: InterestTag) => void
  onDeletePermanently: (tag: InterestTag) => void
}

function ActionsCell({ row, callbacks }: { row: { original: InterestTag }, callbacks?: RowCallbacks }) {
  const [alertOpen, setAlertOpen] = useState(false);

  return (
    <div className="flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                toast.success('Tag ID copied to clipboard')
              }}>
                <IconCopy />
                Copy tag ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => callbacks?.onEdit(row.original)}>
                <IconEdit />
                Edit Details
              </DropdownMenuItem>
              {!row.original.is_active && (
                <DropdownMenuItem onClick={() => callbacks?.onActivate(row.original)}>
                  <IconRestore />
                  Activate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {row.original.is_active && (
                <DropdownMenuItem onClick={() => callbacks?.onDelete(row.original)} variant='destructive'>
                  <IconTrash />
                  Deactivate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                variant='destructive'
                onSelect={(e) => {
                  e.preventDefault();
                  setAlertOpen(true);
                }}
              >
                <IconTrashX />
                Delete Permanently
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              callbacks?.onDeletePermanently(row.original);
              setAlertOpen(false);
            }}>Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
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
      return <ActionsCell row={row} callbacks={callbacks} />;
    }
  }
]