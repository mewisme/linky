"use client";

import { Checkbox } from "@ws/ui/components/ui/checkbox";
import { type ColumnDef } from "@ws/ui/internal-lib/react-table";
import type { AdminAPI } from "@/features/admin/types/admin.types";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

export type BroadcastHistoryRow = AdminAPI.Broadcasts.HistoryRow;

export function useBroadcastColumns(): ColumnDef<BroadcastHistoryRow>[] {
  const t = useTranslations('dataTable')
  return useMemo(() => {
    const formatCreator = (row: BroadcastHistoryRow): string => {
      const name = [row.creator_first_name, row.creator_last_name].filter(Boolean).join(" ").trim();
      return name || row.creator_email || t('common.emDash');
    };

    return [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label={t('common.selectAllAria')}
            className="justify-center flex"
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
        accessorKey: "created_at",
        header: t('broadcasts.date'),
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
        header: t('broadcasts.title'),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title || t('common.emDash')}</span>
        ),
      },
      {
        accessorKey: "message",
        header: t('broadcasts.message'),
        cell: ({ row }) => (
          <span className="max-w-[320px] truncate block text-sm text-muted-foreground">
            {row.original.message}
          </span>
        ),
      },
      {
        id: "created_by",
        header: t('broadcasts.createdBy'),
        cell: ({ row }) => (
          <span className="text-sm">{formatCreator(row.original)}</span>
        ),
      },
    ];
  }, [t]);
}
