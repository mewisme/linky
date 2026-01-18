'use client';

import type { AdminAPI } from '@/types/admin.types';
import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  type ColumnDef,
} from "@tanstack/react-table"
import { IconCircleCheckFilled, IconCircleXFilled, IconDotsVertical } from '@tabler/icons-react';
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
import { toast } from "@repo/ui/components/ui/sonner";
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Status, StatusIndicator, StatusLabel } from "@repo/ui/components/kibo-ui/status";
import { memo } from 'react';

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

export interface RowCallbacks {
  onSelectAllowState?: (user: AdminAPI.User, allow: boolean) => void
  onSelectRole?: (user: AdminAPI.User, role: AdminAPI.UserRole) => void
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
    accessorKey: "allow",
    header: "Allow",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.allow ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconCircleXFilled className="fill-red-500 dark:fill-red-400" />
        )}
        {row.original.allow ? "Allow" : "Block"}
      </Badge>
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
      const user = row.original
      return (
        <div className="flex justify-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
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
                  Select allow state
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={user.allow ? "true" : "false"} onValueChange={(value) => {
                    callbacks?.onSelectAllowState?.(user, value === "true")
                  }}>
                    <DropdownMenuRadioItem value="true">Allow</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="false">Block</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
    enableHiding: false,
    enableSorting: false,
  }
]