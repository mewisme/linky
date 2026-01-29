'use client'

import type { ResourcesAPI } from '@/types/resources.types'
import { type ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@repo/ui/components/ui/checkbox'
import { IconCopy, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { ActionsButton, type ActionItem } from '@/components/common/actions-button'
import { toast } from "@repo/ui/components/ui/sonner"
import {
  Pill,
  PillStatus,
} from "@repo/ui/components/kibo-ui/pill"
import { useMemo } from 'react'

export function getIconForStatus(status: ResourcesAPI.Reports.ReportStatus) {
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
}

function ReportsActionsCell({ row }: { row: { original: ResourcesAPI.Reports.Report } }) {
  const report = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: 'Copy report ID',
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(report.id);
        toast.success('Report ID copied to clipboard');
      },
    },
  ], [report]);

  return <ActionsButton actions={actions} title="Actions" className="flex justify-end" />;
}

export const columns = (callbacks?: RowCallbacks): ColumnDef<ResourcesAPI.Reports.Report>[] => [
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
        <div className="max-w-[300px] truncate">{reason}</div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as ResourcesAPI.Reports.ReportStatus
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
    id: "actions",
    cell: ({ row }) => <ReportsActionsCell row={row} />,
  }
]
