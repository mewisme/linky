'use client';

import type { AdminAPI } from '@/types/admin.types';
import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  type ColumnDef,
} from "@tanstack/react-table"
import { IconCircleCheckFilled, IconCircleXFilled, IconDotsVertical, IconTrash, IconRefresh, IconUserPlus } from '@tabler/icons-react';
import {
  DropdownMenu,
  DropdownMenuSeparator,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@repo/ui/components/animate-ui/components/radix/dropdown-menu';
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
import { toast } from "@repo/ui/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Status, StatusIndicator, StatusLabel } from "@repo/ui/components/kibo-ui/status";
import { memo, useState } from 'react';

export interface RowCallbacks {
  onSelectRole?: (user: AdminAPI.User, role: AdminAPI.UserRole) => void
  onDelete: (user: AdminAPI.User) => void
  onRestore?: (user: AdminAPI.User) => void
  onEmbeddingSync?: (user: AdminAPI.User) => void
  onBulkDelete?: (users: AdminAPI.User[]) => void
  onBulkRestore?: (users: AdminAPI.User[]) => void
  onBulkEmbeddingSync?: (users: AdminAPI.User[]) => void
}

type User = AdminAPI.User;

const AvatarCell = memo(({ avatarUrl, firstName, lastName }: { avatarUrl: string | null | undefined; firstName?: string | null; lastName?: string | null }) => {
  return (
    <Avatar>
      <AvatarImage src={avatarUrl || undefined} />
      <AvatarFallback>{firstName?.charAt(0) || lastName?.charAt(0) || '?'}</AvatarFallback>
    </Avatar>
  )
}, (prevProps, nextProps) => {
  return prevProps.avatarUrl === nextProps.avatarUrl &&
    prevProps.firstName === nextProps.firstName &&
    prevProps.lastName === nextProps.lastName
})

AvatarCell.displayName = 'AvatarCell'

function ActionsCell({ row, callbacks }: { row: { original: User }, callbacks?: RowCallbacks }) {
  const [alertOpen, setAlertOpen] = useState(false);

  const user = row.original;
  const isDeleted = user.deleted === true;

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
          <DropdownMenuContent align="end" className='overflow-hidden'>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(user.id)
                toast.success('User ID copied to clipboard')
              }}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(user.clerk_user_id)
                toast.success('Clerk user ID copied to clipboard')
              }}
            >
              Copy Clerk user ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Select role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup value={user.role} onValueChange={(value) => {
                  callbacks?.onSelectRole?.(user, value as AdminAPI.UserRole)
                }}>
                  <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="member">Member</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            {isDeleted && callbacks?.onRestore && (
              <DropdownMenuItem
                onClick={() => callbacks.onRestore?.(user)}
                data-testid="admin-user-restore-button"
              >
                <IconUserPlus />
                Restore user
              </DropdownMenuItem>
            )}
            {callbacks?.onEmbeddingSync && (
              <DropdownMenuItem
                onClick={() => callbacks.onEmbeddingSync?.(user)}
                data-testid="admin-user-embedding-sync-button"
              >
                <IconRefresh />
                Manual embedding sync
              </DropdownMenuItem>
            )}
            {!isDeleted && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setAlertOpen(true);
                  }}
                  variant='destructive'
                  data-testid="admin-user-delete-button"
                >
                  <IconTrash />
                  Delete user
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent data-testid="dialog-container">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="dialog-cancel-button">No, go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                callbacks?.onDelete(user);
                setAlertOpen(false);
              }}
              data-testid="admin-user-confirm-delete"
            >Yes, delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<User>[] => [
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
    accessorKey: "avatar_url",
    header: "Avatar",
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
    header: "ID",
    cell: ({ row }) => <div>{row.getValue("id")}</div>,

  },
  {
    accessorKey: "clerk_user_id",
    header: "Clerk User ID",
    cell: ({ row }) => <div>{row.getValue("clerk_user_id")}</div>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "first_name",
    header: "First Name",
    cell: ({ row }) => <div>{row.getValue("first_name")}</div>,
  },
  {
    accessorKey: "last_name",
    header: "Last Name",
    cell: ({ row }) => <div>{row.getValue("last_name")}</div>,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <div>{row.getValue("role")}</div>,
  },
  {
    accessorKey: "level",
    header: "Level",
    cell: ({ row }) => <div>{row.original.level ?? 1}</div>,
  },
  {
    accessorKey: "deleted",
    header: "Deleted",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {!row.original.deleted ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconCircleXFilled className="fill-red-500 dark:fill-red-400" />
        )}
        {row.original.deleted ? "Deleted" : "Active"}
      </Badge>
    ),
  },
  {
    accessorKey: "details.bio",
    id: "bio",
    header: "Bio",
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate" title={row.original.details?.bio ?? undefined}>
        {row.original.details?.bio ?? "-"}
      </div>
    ),
  },
  {
    accessorKey: "interest_tag_names",
    id: "interest_tag_names",
    header: "Interest Tags",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1 max-w-[200px]">
        {(row.original.interest_tag_names ?? []).length > 0
          ? row.original.interest_tag_names.map((name) => (
            <Badge key={name} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))
          : "-"}
      </div>
    ),
  },
  {
    accessorKey: "embedding",
    id: "embedding_status",
    header: "Embedding",
    cell: ({ row }) => (
      <div>{row.original.embedding ? "Synced" : "None"}</div>
    ),
  },
  {
    accessorKey: "embedding.updated_at",
    id: "embedding_updated_at",
    header: "Embedding Updated",
    cell: ({ row }) => (
      <div>{row.original.embedding?.updated_at ?? "-"}</div>
    ),
  },
  {
    accessorKey: "presence",
    header: "Presence",
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
    header: "Created At",
    cell: ({ row }) => <div>{row.getValue("created_at")}</div>,
  },
  {
    accessorKey: "updated_at",
    header: "Updated At",
    cell: ({ row }) => <div>{row.getValue("updated_at")}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <ActionsCell row={row} callbacks={callbacks} />
      )
    },
    enableHiding: false,
    enableSorting: false,
  }
]