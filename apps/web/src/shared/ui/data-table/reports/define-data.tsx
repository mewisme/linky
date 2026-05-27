'use client'

import type { ResourcesAPI } from '@/shared/types/resources.types'
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import { Checkbox } from '@ws/ui/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@ws/ui/components/ui/avatar'
import { IconCopy, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button'
import { SimpleTooltip } from '@/shared/ui/common/simple-tooltip'
import { toast } from "@ws/ui/components/ui/sonner"
import {
  Pill,
  PillStatus,
} from "@ws/ui/components/kibo-ui/pill"
import { useMemo } from 'react'
import { useTranslations } from 'next-intl'

interface UserCellProps {
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  userId?: string | null;
  fallback: string;
}

function UserCell({ firstName, lastName, avatarUrl, userId, fallback }: UserCellProps) {
  const name = `${firstName || ''} ${lastName || ''}`.trim() || fallback;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={avatarUrl || ''} alt={name} />
        <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <SimpleTooltip content={userId}>
        <span className="font-medium truncate">{name}</span>
      </SimpleTooltip>
    </div>
  );
}

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
  const tc = useTranslations('common')
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

  return <ActionsButton actions={actions} title={tc('actions')} className="flex justify-end" />;
}

export function useReportColumns(_callbacks?: RowCallbacks): ColumnDef<ResourcesAPI.Reports.Report>[] {
  const t = useTranslations('dataTable')
  const tc = useTranslations('common')
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
      cell: ({ row }) => (
        <UserCell
          firstName={row.original.reported_first_name}
          lastName={row.original.reported_last_name}
          avatarUrl={row.original.reported_avatar_url}
          userId={row.original.reported_user_id}
          fallback={tc('unknownUser')}
        />
      ),
    },
    {
      accessorKey: 'reason',
      header: tc('reason'),
      cell: ({ row }) => {
        const reason = row.getValue('reason') as string
        return (
          <div className="max-w-[300px] truncate">{reason}</div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: tc('status'),
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
      header: tc('createdAt'),
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
