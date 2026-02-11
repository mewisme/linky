"use client";

import { Checkbox } from "@ws/ui/components/ui/checkbox";
import { type ColumnDef } from "@tanstack/react-table";
import type { AdminAPI } from "@/types/admin.types";

export type BroadcastHistoryRow = AdminAPI.Broadcasts.HistoryRow;

function formatCreator(row: BroadcastHistoryRow): string {
  const name = [row.creator_first_name, row.creator_last_name].filter(Boolean).join(" ").trim();
  return name || row.creator_email || "—";
}

export const columns: ColumnDef<BroadcastHistoryRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="justify-center flex"
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
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-muted-foreground text-sm">
        {new Date(row.original.created_at).toLocaleString(undefined, {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </span>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.title || "—"}</span>
    ),
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => (
      <span className="max-w-[320px] truncate block text-sm text-muted-foreground">
        {row.original.message}
      </span>
    ),
  },
  {
    id: "created_by",
    header: "Created by",
    cell: ({ row }) => (
      <span className="text-sm">{formatCreator(row.original)}</span>
    ),
  },
];
