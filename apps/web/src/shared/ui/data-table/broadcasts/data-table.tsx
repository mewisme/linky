"use client";

import { DataTable } from "../data-table";
import { useBroadcastColumns, type BroadcastHistoryRow } from "./define-data";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";

interface BroadcastsDataTableProps {
  initialData: BroadcastHistoryRow[];
  className?: string;
  leftColumnVisibilityContent?: React.ReactNode;
}

export function BroadcastsDataTable({
  initialData,
  className,
  leftColumnVisibilityContent = null,
}: BroadcastsDataTableProps) {
  const t = useTranslations('dataTable')
  const tableColumns = useBroadcastColumns();

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{}}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      filterColumn="message"
      filterPlaceholder={t('broadcasts.filterPlaceholder')}
    />
  );
}
