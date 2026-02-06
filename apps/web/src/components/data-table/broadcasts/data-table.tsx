"use client";

import { useMemo } from "react";

import { DataTable } from "../data-table";
import { columns, type BroadcastHistoryRow } from "./define-data";
import { cn } from "@repo/ui/lib/utils";

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
  const tableColumns = useMemo(() => columns, []);

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{}}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      filterColumn="message"
      filterPlaceholder="Search broadcasts..."
    />
  );
}
