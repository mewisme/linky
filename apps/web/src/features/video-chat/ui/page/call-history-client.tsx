"use client";

import { AppLayout } from "@/shared/ui/layouts/app-layout";
import type { CallHistoryResponse } from "@/entities/call-history/types/call-history.types";
import dynamic from "next/dynamic";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { DataTableRefreshButton } from "@/shared/ui/data-table/refresh-button";
import {
  useDataTableWithQuery,
} from "@/shared/ui/data-table/use-data-table-with-query";
import {
  useCallHistoryDataTable,
} from "@/shared/ui/data-table/call-history/data-table";
import { dataTableStateToPageParams } from "@/shared/ui/data-table/use-data-table";

const CallHistoryDataTable = dynamic(
  () =>
    import("@/shared/ui/data-table/call-history/data-table").then((mod) => ({
      default: mod.CallHistoryDataTable,
    })),
  { ssr: false },
);

export function CallHistoryClient() {
  const { dataTable, isLoading, isFetching, refetch, tableData } =
    useDataTableWithQuery({
      useDataTableHook: useCallHistoryDataTable,
      queryKey: ["call-history"],
      queryFn: (state) => {
        const { page, size } = dataTableStateToPageParams(state);
        const offset = page * size;
        const params = new URLSearchParams({
          limit: String(size),
          offset: String(offset),
        });
        return fetchFromActionRoute<CallHistoryResponse>(
          `/api/resources/call-history?${params.toString()}`,
        );
      },
    });

  return (
    <AppLayout sidebarItem="callHistory">
      <div data-testid="call-history-page">
        {!isLoading && tableData.length === 0 && (
          <div data-testid="call-history-empty-state" />
        )}
        <CallHistoryDataTable
          dataTable={dataTable}
          isLoading={isLoading}
          leftColumnVisibilityContent={
            <DataTableRefreshButton
              onClick={() => void refetch()}
              isFetching={isFetching}
              testId="call-history-refresh-button"
            />
          }
        />
      </div>
    </AppLayout>
  );
}
