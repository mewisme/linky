'use client';

import { AdminAPI } from '@/types/api.types';
import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Badge } from '@repo/ui/components/ui/badge';
import {
  type ColumnDef,
} from "@tanstack/react-table"
import { IconCircleCheckFilled, IconCircleXFilled, IconDotsVertical, IconGripVertical } from '@tabler/icons-react';
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
  DropdownMenuPortal
} from '@repo/ui/components/ui/dropdown-menu';
import toast from 'react-hot-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Status, StatusIndicator, StatusLabel } from "@repo/ui/components/kibo-ui/status";
import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';

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

export interface TableCallbacks {
  onSelectAllowState?: (userId: string, allow: boolean) => void
  onSelectRole?: (userId: string, role: AdminAPI.UserRole) => void
}

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

export const columns = (callbacks?: TableCallbacks): ColumnDef<User>[] => [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
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
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={user.allow ? "true" : "false"} onValueChange={(value) => {
                    callbacks?.onSelectAllowState?.(user.id, value === "true")
                  }}>
                    <DropdownMenuRadioItem value="true">Allow</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="false">Block</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                Select role
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={user.role} onValueChange={(value) => {
                    callbacks?.onSelectRole?.(user.id, value as AdminAPI.UserRole)
                  }}>
                    <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="member">Member</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    enableHiding: false,
    enableSorting: false,
  }
]