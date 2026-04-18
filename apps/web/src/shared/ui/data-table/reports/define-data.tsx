'use client'

import type { ResourcesAPI } from '@/shared/types/resources.types'
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import { Checkbox } from '@ws/ui/components/ui/checkbox'
import { IconCopy, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button'
import { toast } from "@ws/ui/components/ui/sonner"
import {
  Pill,
  PillStatus,
} from "@ws/ui/components/kibo-ui/pill"
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

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

export type RowCallbacks = Record<string, unknown>;

function ReportsActionsCell({ row }: { row: { original: ResourcesAPI.Reports.Report } }) {
  const t = useTranslations('dataTable')
  const report = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: t('reports.copyReportId'),
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(report.id);
        toast.success(t('reports.reportIdCopied'));
      },
    },
  ], [report, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} className="flex justify-end" />;
}

export function useReportColumns(_callbacks?: RowCallbacks): ColumnDef<ResourcesAPI.Reports.Report>[] {
  const t = useTranslations('dataTable')
  return useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('common.selectAllAria')}
          className='justify-center flex'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('common.selectRowAria')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'reported_user_id',
      header: t('reports.reportedUser'),
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('reported_user_id')}</div>,
    },
    {
      accessorKey: 'reason',
      header: t('reports.reason'),
      cell: ({ row }) => {
        const reason = row.getValue('reason') as string
        return (
          <div className="max-w-[300px] truncate">{reason}</div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: t('reports.status'),
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
      header: t('reports.createdAt'),
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
  ], [t])
}
