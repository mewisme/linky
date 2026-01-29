'use client'

import type { AdminAPI } from '@/types/admin.types'
import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import { IconCopy, IconEye, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { ActionsButton, type ActionItem } from '@/components/common/actions-button'
import { toast } from "@repo/ui/components/ui/sonner"
import {
  Pill,
  PillStatus,
} from "@repo/ui/components/kibo-ui/pill"
import { useMemo } from 'react'

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

function AdminReportsActionsCell({ row, callbacks }: { row: { original: AdminAPI.Reports.Report }; callbacks?: RowCallbacks }) {
  const report = row.original;

  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];
    if (callbacks?.onView) {
      items.push({
        type: 'item',
        label: 'View details',
        icon: <IconEye className="size-4" />,
        onClick: () => callbacks.onView?.(report),
      });
    }
    items.push({
      type: 'item',
      label: 'Copy report ID',
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(report.id);
        toast.success('Report ID copied to clipboard');
      },
    });
    return items;
  }, [report, callbacks]);

  return <ActionsButton actions={actions} title="Actions" className="flex justify-end" />;
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
    cell: ({ row }) => <AdminReportsActionsCell row={row} callbacks={callbacks} />,
  }
]
