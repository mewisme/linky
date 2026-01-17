'use client'

import type { AdminAPI } from '@/types/admin.types'
import { type ColumnDef } from '@tanstack/react-table'
import { Button } from '@repo/ui/components/ui/button'
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import { IconDotsVertical, IconCopy, IconEye, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@repo/ui/components/animate-ui/components/radix/dropdown-menu'
import { toast } from "@repo/ui/components/ui/sonner"
import {
  Pill,
  PillStatus,
} from "@repo/ui/components/kibo-ui/pill";

export function getIconForStatus(status: AdminAPI.Reports.ReportStatus) {
  switch (status) {
    case 'pending':
      return <IconAlertCircle className="size-4 text-amber-500" />
    case 'reviewed':
      return <IconCheck className="size-4 text-green-500" />
    case 'resolved':
      return <IconCheck className="size-4 text-green-500" />
    case 'dismissed':
  }
  return <IconAlertCircle className="size-4 text-amber-500" />
}

export interface RowCallbacks {
  onView?: (report: AdminAPI.Reports.Report) => void
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<AdminAPI.Reports.Report>[] => [
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
    accessorKey: 'reporter_user_id',
    header: 'Reporter User',
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('reporter_user_id')}</div>,
  },
  {
    accessorKey: 'reported_user_id',
    header: 'Reported User',
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('reported_user_id')}</div>,
  },
  {
    accessorKey: 'reason',
    header: 'Reason',
    cell: ({ row }) => {
      const reason = row.getValue('reason') as string
      return (
        <div className="max-w-[250px] truncate text-muted-foreground">{reason}</div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as AdminAPI.Reports.ReportStatus
      return (
        <Pill>
          <PillStatus>
            {getIconForStatus(status)}
          </PillStatus>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Pill>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'))
      return (
        <div className="text-sm text-muted-foreground">
          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      )
    },
  },
  {
    accessorKey: 'reviewed_by',
    header: 'Reviewed By',
    cell: ({ row }) => {
      const reviewedBy = row.original.reviewed_by
      return (
        <div className="text-sm text-muted-foreground">
          {reviewedBy ? <span className="font-mono">{reviewedBy}</span> : <span className="text-muted-foreground/50">—</span>}
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const report = row.original
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
                <DropdownMenuItem onClick={() => {
                  callbacks?.onView?.(report)
                }}>
                  <IconEye />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  navigator.clipboard.writeText(report.id)
                  toast.success('Report ID copied to clipboard')
                }}>
                  <IconCopy />
                  Copy report ID
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  }
]
