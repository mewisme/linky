"use client";

import { useQuery } from "@ws/ui/internal-lib/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  type DataTableState,
  type UseDataTableOptions,
  type UseDataTableReturn,
} from "./use-data-table";

export interface PageMeta {
  pageCount: number;
  rowCount?: number;
}

type DataTableHook<TData, THookOptions> = (
  options: UseDataTableOptions<TData> & THookOptions,
) => UseDataTableReturn<TData>;

export interface UseDataTableWithQueryOptions<
  TData,
  TResponse = unknown,
  THookOptions extends Record<string, unknown> = Record<string, never>,
> {
  useDataTableHook: DataTableHook<TData, THookOptions>;
  dataTableOptions?: THookOptions;
  queryKey: readonly unknown[];
  queryFn: (state: DataTableState) => Promise<TResponse>;
  manualPagination?: boolean;
  selectRows?: (response: TResponse) => TData[];
  selectPageMeta?: (response: TResponse, state: DataTableState) => PageMeta;
  enabled?: boolean;
  resetPageWhen?: unknown;
}

export function useDataTableWithQuery<
  TData,
  TResponse = unknown,
  THookOptions extends Record<string, unknown> = Record<string, never>,
>({
  useDataTableHook,
  dataTableOptions,
  queryKey,
  queryFn,
  manualPagination = true,
  selectRows = defaultSelectRows as (response: TResponse) => TData[],
  selectPageMeta = defaultSelectPageMeta as (
    response: TResponse,
    state: DataTableState,
  ) => PageMeta,
  enabled = true,
  resetPageWhen,
}: UseDataTableWithQueryOptions<TData, TResponse, THookOptions>) {
  const dataRef = useRef<TData[]>([]);
  const pageCountRef = useRef(0);
  const rowCountRef = useRef<number | undefined>(undefined);

  const dataTable = useDataTableHook({
    ...(dataTableOptions ?? ({} as THookOptions)),
    data: dataRef.current,
    manualPagination,
    pageCount: manualPagination ? pageCountRef.current : undefined,
    rowCount: manualPagination ? rowCountRef.current : undefined,
  } as UseDataTableOptions<TData> & THookOptions);

  const { pagination, sorting, columnFilters } = dataTable.state;

  const query = useQuery({
    queryKey: [...queryKey, pagination, sorting, columnFilters],
    queryFn: () => queryFn(dataTable.state),
    enabled,
    placeholderData: (previousData) => previousData,
  });

  const tableData = useMemo(() => {
    if (query.data === undefined) return [] as TData[];
    return selectRows(query.data);
  }, [query.data, selectRows]);

  const pageMeta = useMemo((): PageMeta => {
    if (query.data === undefined) return { pageCount: 0, rowCount: undefined };
    return selectPageMeta(query.data, dataTable.state);
  }, [query.data, selectPageMeta, dataTable.state]);

  dataRef.current = tableData;
  pageCountRef.current = pageMeta.pageCount;
  rowCountRef.current = pageMeta.rowCount;

  useEffect(() => {
    if (resetPageWhen !== undefined) {
      dataTable.table.setPageIndex(0);
    }
  }, [resetPageWhen]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    dataTable,
    tableData,
    pageMeta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    data: query.data,
  };
}

function defaultSelectRows<TData>(response: unknown): TData[] {
  const data = (response as { data?: TData[] })?.data;
  return Array.isArray(data) ? data : [];
}

function defaultSelectPageMeta(
  response: unknown,
  state: DataTableState,
): PageMeta {
  const data = response as Record<string, unknown>;
  const pagination = data?.pagination as
    | { totalPages?: number; total?: number }
    | undefined;
  if (pagination?.totalPages !== undefined) {
    return {
      pageCount: pagination.totalPages,
      rowCount: pagination.total,
    };
  }
  if (typeof data?.count === "number") {
    return {
      pageCount:
        Math.ceil(data.count / state.pagination.pageSize) || 1,
      rowCount: data.count as number,
    };
  }
  return { pageCount: 0, rowCount: undefined };
}
