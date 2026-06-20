"use client";
import { debounce } from "lodash-es";
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Row,
  type Table as TanstackTable,
} from "@ws/ui/internal-lib/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@ws/ui/components/animate-ui/components/radix/dropdown-menu";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconSearch,
} from "@tabler/icons-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@ws/ui/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ws/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ws/ui/components/ui/table";

import { Button } from "@ws/ui/components/ui/button";
import { Label } from "@ws/ui/components/ui/label";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { SimpleTooltip } from "../common/simple-tooltip";
import { Loader } from "@/shared/ui/loader";
import { useTextHighlight } from "./use-text-highlight";

type DataTableProps<TData> =
  | DataTableWithExternalTableProps<TData>
  | DataTableWithInternalStateProps<TData>;

interface DataTableCommonProps<TData> {
  columns: ColumnDef<TData>[];
  className?: string;
  isLoading?: boolean;
  loadingTitle?: string;
  filterColumns?: string | string[];
  filterPlaceholder?: string;
  leftColumnVisibilityContent?: React.ReactNode;
  rightColumnVisibilityContent?: React.ReactNode;
  bulkActionsContent?: (selectedRows: TData[]) => React.ReactNode;
  getRowClassName?: (row: TData) => string | undefined;
  selectionResetKey?: unknown;
}

interface DataTableWithExternalTableProps<TData>
  extends DataTableCommonProps<TData> {
  table: TanstackTable<TData>;
  initialData?: never;
  initialColumnVisibility?: never;
}

interface DataTableWithInternalStateProps<TData>
  extends DataTableCommonProps<TData> {
  table?: never;
  initialData: TData[];
  initialColumnVisibility: VisibilityState;
}

export function DataTable<TData>(props: DataTableProps<TData>) {
  const {
    columns,
    className,
    isLoading = false,
    loadingTitle,
    leftColumnVisibilityContent = null,
    rightColumnVisibilityContent = null,
    bulkActionsContent,
    getRowClassName,
    selectionResetKey,
    filterColumns,
    filterPlaceholder,
  } = props;

  const t = useTranslations("dataTable.common");

  const externalTable = "table" in props && props.table ? props.table : undefined;
  const isExternal = !!externalTable;

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    isExternal ? {} : (props as DataTableWithInternalStateProps<TData>).initialColumnVisibility,
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const filterColumnIds = useMemo<string[]>(() => {
    if (!filterColumns) return [];
    return Array.isArray(filterColumns) ? filterColumns : [filterColumns];
  }, [filterColumns]);

  const filterColumnLabel = useMemo(
    () => filterColumnIds.map((id) => id.replace(/_/g, " ")).join(", "),
    [filterColumnIds],
  );

  useEffect(() => {
    if (selectionResetKey === undefined) return;
    const tid = setTimeout(() => {
      if (isExternal) {
        externalTable!.toggleAllRowsSelected(false);
      } else {
        setRowSelection({});
      }
    }, 0);
    return () => clearTimeout(tid);
  }, [selectionResetKey, isExternal, externalTable]);

  const globalFilterFn = useMemo(
    () =>
      (row: Row<TData>, _columnId: string, filterValue: string): boolean => {
        const term = String(filterValue ?? "")
          .trim()
          .toLowerCase();
        if (!term) return true;
        if (filterColumnIds.length === 0) return true;
        return filterColumnIds.some((id) => {
          const value = row.getValue(id);
          if (value == null) return false;
          return String(value).toLowerCase().includes(term);
        });
      },
    [filterColumnIds],
  );

  const internalTable = useReactTable({
    data: isExternal
      ? []
      : (props as DataTableWithInternalStateProps<TData>).initialData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      globalFilter,
    },
  });

  const table = externalTable ?? internalTable;

  const debouncedFilter = useMemo(
    () =>
      debounce((value: string) => {
        if (filterColumnIds.length === 0) return;
        table.setGlobalFilter(value);
      }, 250),
    [filterColumnIds, table],
  );
  useEffect(() => () => debouncedFilter.cancel(), [debouncedFilter]);

  const [filterInput, setFilterInput] = useState("");

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const highlightSelector = useMemo(() => {
    if (filterColumnIds.length === 0) return undefined;
    return filterColumnIds
      .map((id) => `[data-column-id="${id.replace(/"/g, '\\"')}"]`)
      .join(",");
  }, [filterColumnIds]);

  useTextHighlight({
    containerRef: tableContainerRef,
    term: filterInput,
    scopeSelector: highlightSelector,
  });

  const isTableLoading = isLoading;
  const rowCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRowCount = table.getFilteredRowModel().rows.length;
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center py-4 space-x-2">
        {filterColumnIds.length > 0 ? (
          <InputGroup className="max-w-sm">
            <InputGroupInput
              value={filterInput}
              placeholder={
                filterPlaceholder ??
                t("filterColumnPlaceholder", { column: filterColumnLabel })
              }
              onChange={(event) => {
                const value = event.target.value;
                setFilterInput(value);
                debouncedFilter(value);
              }}
            />
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
          </InputGroup>
        ) : (
          <div className="max-w-sm" />
        )}
        <div className="flex items-center gap-2 ml-auto">
          {leftColumnVisibilityContent && leftColumnVisibilityContent}
          <DropdownMenu>
            <SimpleTooltip content={t("customizeColumns")}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto" size="sm">
                  <IconLayoutColumns />
                  <span className="hidden 2xl:inline">
                    {t("customizeColumns")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
            </SimpleTooltip>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase())}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          {bulkActionsContent &&
            bulkActionsContent(
              table.getFilteredSelectedRowModel().rows.map((r) => r.original),
            )}

          {rightColumnVisibilityContent && rightColumnVisibilityContent}
        </div>
      </div>
      <div
        className="overflow-hidden rounded-md border"
        ref={tableContainerRef}
      >
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="**:data-[slot=table-cell]:last:w-20 **:data-[slot=table-cell]:first:w-10">
            {isTableLoading ? (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-48 p-0"
                >
                  <Loader
                    title={loadingTitle ?? t("loading")}
                    size="md"
                    className="w-full py-12"
                  />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn("group", getRowClassName?.(row.original))}
                  data-testid={
                    row.original &&
                      typeof row.original === "object" &&
                      "id" in row.original
                      ? `admin-user-row-${row.original.id}`
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} data-column-id={cell.column.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground text-sm flex-1">
          {t("rowsSelected", {
            selected: rowCount,
            total: totalRowCount,
          })}
        </div>
        <div className="flex items-center gap-8 w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              {t("rowsPerPage")}
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            {t("pageIndicator", {
              current: currentPage,
              total: totalPages,
            })}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!canPrev}
            >
              <span className="sr-only">{t("goToFirstPage")}</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!canPrev}
            >
              <span className="sr-only">{t("goToPreviousPage")}</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!canNext}
            >
              <span className="sr-only">{t("goToNextPage")}</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!canNext}
            >
              <span className="sr-only">{t("goToLastPage")}</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
