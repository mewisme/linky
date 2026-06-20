"use client";

import type { CallHistoryRecord } from "@/entities/call-history/types/call-history.types";
import { useCallHistoryColumns, type RowCallbacks } from "./define-data";
import { useDataTable, type UseDataTableOptions, type UseDataTableReturn } from "../use-data-table";
import { DataTable } from "../data-table";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";

const CALL_HISTORY_COLUMN_VISIBILITY = {
  id: false,
} as const;

export interface UseCallHistoryDataTableOptions
  extends Omit<
    UseDataTableOptions<CallHistoryRecord>,
    "columns" | "initialColumnVisibility"
  > {
  callbacks?: RowCallbacks;
}

export function useCallHistoryDataTable(
  options: UseCallHistoryDataTableOptions,
): UseDataTableReturn<CallHistoryRecord> {
  const { callbacks, ...rest } = options;
  const tableColumns = useCallHistoryColumns(callbacks);

  return useDataTable({
    ...rest,
    columns: tableColumns,
    initialColumnVisibility: CALL_HISTORY_COLUMN_VISIBILITY,
  });
}

interface CallHistoryDataTableViewProps {
  table: UseDataTableReturn<CallHistoryRecord>["table"];
  isLoading?: boolean;
  className?: string;
  callbacks?: RowCallbacks;
  leftColumnVisibilityContent?: React.ReactNode;
}

export function CallHistoryDataTableView({
  table,
  isLoading = false,
  className,
  callbacks,
  leftColumnVisibilityContent = null,
}: CallHistoryDataTableViewProps) {
  const t = useTranslations("dataTable");
  const tableColumns = useCallHistoryColumns(callbacks);

  return (
    <div data-testid="call-history-table">
      <DataTable
        table={table}
        columns={tableColumns}
        isLoading={isLoading}
        loadingTitle={t("callHistory.loadingTitle")}
        className={cn(className)}
        leftColumnVisibilityContent={leftColumnVisibilityContent}
      />
    </div>
  );
}

type CallHistoryDataTableCommonProps = Omit<
  CallHistoryDataTableViewProps,
  "table"
>;

type CallHistoryDataTableProps = CallHistoryDataTableCommonProps &
  (
    | {
      dataTable: UseDataTableReturn<CallHistoryRecord>;
      initialData?: never;
      callbacks?: never;
    }
    | {
      dataTable?: never;
      initialData: CallHistoryRecord[];
      callbacks?: RowCallbacks;
    }
  );

function CallHistoryDataTableWithData({
  initialData,
  callbacks,
  ...viewProps
}: CallHistoryDataTableCommonProps & {
  initialData: CallHistoryRecord[];
  callbacks?: RowCallbacks;
}) {
  const dataTable = useCallHistoryDataTable({ data: initialData, callbacks });
  return (
    <CallHistoryDataTableView
      table={dataTable.table}
      callbacks={callbacks}
      {...viewProps}
    />
  );
}

export function CallHistoryDataTable(props: CallHistoryDataTableProps) {
  if ("dataTable" in props && props.dataTable) {
    const { dataTable, callbacks, ...viewProps } = props;
    return (
      <CallHistoryDataTableView
        table={dataTable.table}
        callbacks={callbacks}
        {...viewProps}
      />
    );
  }

  const { initialData, callbacks, ...viewProps } = props;
  return (
    <CallHistoryDataTableWithData
      initialData={initialData!}
      callbacks={callbacks}
      {...viewProps}
    />
  );
}
