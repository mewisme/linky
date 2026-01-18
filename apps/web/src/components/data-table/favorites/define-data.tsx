'use client'

import { CountryFlag } from "@/components/common/country-flag";
import type { ResourcesAPI } from "@/types/resources.types";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import { Button } from "@repo/ui/components/ui/button";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import { type ColumnDef } from "@tanstack/react-table";
import { IconDotsVertical, IconTrash } from "@tabler/icons-react";
import { formatDuration } from "@/utils/call-history";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@repo/ui/components/animate-ui/components/radix/dropdown-menu';

export interface RowCallbacks {
  onRemove?: (favorite: ResourcesAPI.Favorites.FavoriteWithStats) => void;
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<ResourcesAPI.Favorites.FavoriteWithStats>[] => [
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
    accessorKey: "favorite_user",
    header: "User",
    cell: ({ row }) => {
      const name = `${row.original.first_name || ""} ${row.original.last_name || ""}`.trim() || "Unknown";
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={row.original.avatar_url || ""} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CountryFlag countryCode={row.original.country || ""} /> {row.original.country}
            </span>
          </div>
        </div>
      )
    }
  },
  {
    accessorKey: "match_count",
    header: "Matches",
    cell: ({ row }) => {
      return (
        <span className="font-medium">{row.original.match_count}</span>
      )
    }
  },
  {
    accessorKey: "total_duration",
    header: "Total Duration",
    cell: ({ row }) => {
      return (
        <span className="font-medium text-primary">{formatDuration(row.original.total_duration || 0)}</span>
      )
    }
  },
  {
    accessorKey: "average_duration",
    header: "Avg Duration",
    cell: ({ row }) => {
      return (
        <span className="font-medium text-muted-foreground">{formatDuration(Math.round(row.original.average_duration || 0))}</span>
      )
    }
  },
  {
    accessorKey: "created_at",
    header: "Added",
    cell: ({ row }) => {
      return (
        <span className="text-muted-foreground text-sm">{new Date(row.original.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      )
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="sm">
                <IconDotsVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => callbacks?.onRemove?.(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <IconTrash />
                  Remove from favorites
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  }
]
