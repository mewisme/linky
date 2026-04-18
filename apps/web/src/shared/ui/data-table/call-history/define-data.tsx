'use client'

import { CountryFlag } from "@/shared/ui/common/country-flag";
import type { CallHistoryRecord } from "@/entities/call-history/types/call-history.types";
import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import { Badge } from "@ws/ui/components/ui/badge";
import { Checkbox } from "@ws/ui/components/ui/checkbox";
import { type ColumnDef } from "@ws/ui/internal-lib/react-table";
import { IconPhoneOutgoing, IconPhoneIncoming, IconCopy } from "@tabler/icons-react";
import { formatDuration } from "@/entities/call-history/utils/call-history";
import { ActionsButton, type ActionItem } from "@/shared/ui/common/actions-button";
import { toast } from "@ws/ui/components/ui/sonner";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

export type RowCallbacks = Record<string, unknown>;

function CallHistoryActionsCell({ row }: { row: { original: CallHistoryRecord } }) {
  const t = useTranslations('dataTable')
  const record = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: t('callHistory.copyCallId'),
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(record.id);
        toast.success(t('callHistory.callIdCopied'));
      },
    },
  ], [record, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} className="flex justify-end" />;
}

export function useCallHistoryColumns(_callbacks?: RowCallbacks): ColumnDef<CallHistoryRecord>[] {
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
      accessorKey: "other_user",
      header: t('callHistory.user'),
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={row.original.other_user?.avatar_url || ""} alt={row.original.other_user?.name || ""} />
              <AvatarFallback>{row.original.other_user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{row.original.other_user?.name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CountryFlag countryCode={row.original.other_user?.country || ""} /> {row.original.other_user?.country}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: "is_caller",
      header: t('callHistory.status'),
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="gap-1 font-normal">
            {row.original.is_caller ? (
              <IconPhoneOutgoing className="h-3 w-3 text-blue-500" stroke={2.5} />
            ) : (
              <IconPhoneIncoming className="h-3 w-3 text-emerald-500" stroke={2.5} />
            )}
            {row.original.is_caller ? t('callHistory.outgoing') : t('callHistory.incoming')}
          </Badge>
        )
      }
    },
    {
      accessorKey: "duration_seconds",
      header: t('callHistory.duration'),
      cell: ({ row }) => {
        return (
          <span className="font-medium text-primary">{formatDuration(row.original.duration_seconds || 0)}</span>
        )
      }
    },
    {
      accessorKey: "started_at",
      header: t('callHistory.dateTime'),
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground text-sm">{new Date(row.original.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        )
      }
    },
    {
      id: "actions",
      cell: ({ row }) => <CallHistoryActionsCell row={row} />,
    }
  ], [t])
}
