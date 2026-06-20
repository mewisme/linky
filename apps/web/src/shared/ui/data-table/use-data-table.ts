"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
} from "@ws/ui/internal-lib/react-table";
import { useMemo, useState } from "react";

export interface DataTableState {
  pagination: PaginationState;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
}

export interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  initialColumnVisibility?: VisibilityState;
  initialPagination?: PaginationState;
  manualPagination?: boolean;
  pageCount?: number;
  rowCount?: number;
  globalFilterFn?: (
    row: Row<TData>,
    columnId: string,
    filterValue: string,
  ) => boolean;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

export interface UseDataTableReturn<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
  state: DataTableState;
  setGlobalFilter: (value: string) => void;
}

export function useDataTable<TData>({
  data,
  columns,
  initialColumnVisibility = {},
  initialPagination = { pageIndex: 0, pageSize: 10 },
  manualPagination = false,
  pageCount,
  rowCount,
  globalFilterFn,
  globalFilter,
  onGlobalFilterChange,
}: UseDataTableOptions<TData>): UseDataTableReturn<TData> {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility,
  );
  const [pagination, setPagination] = useState<PaginationState>(initialPagination);

  const internalGlobalFilterFn = useMemo(
    () =>
      globalFilterFn ??
      ((() => true) as (
        row: Row<TData>,
        columnId: string,
        filterValue: string,
      ) => boolean),
    [globalFilterFn],
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    globalFilterFn: internalGlobalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(manualPagination
      ? { manualPagination: true, pageCount, rowCount }
      : { getPaginationRowModel: getPaginationRowModel() }),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      globalFilter: globalFilter ?? "",
    },
  });

  return {
    table,
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    setGlobalFilter: onGlobalFilterChange ?? (() => { }),
  };
}

export function dataTableStateToPageParams(state: DataTableState) {
  return {
    page: state.pagination.pageIndex,
    size: state.pagination.pageSize,
  };
}

export function dataTableStateToSortParam(
  state: DataTableState,
): string | undefined {
  const [sort] = state.sorting;
  if (!sort) return undefined;
  return `${sort.id},${sort.desc ? "desc" : "asc"}`;
}

export function dataTableStateToFilterValue(
  state: DataTableState,
  columnId: string,
): string | undefined {
  const filter = state.columnFilters.find((f) => f.id === columnId);
  const value = filter?.value;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
