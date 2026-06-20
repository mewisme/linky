"use client";

import type { AdminAPI } from "@/features/admin/types/admin.types";
import { useUsersColumns, type RowCallbacks } from "./define-data";
import { useDataTable, type UseDataTableOptions, type UseDataTableReturn } from "../use-data-table";
import { DataTable } from "../data-table";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";

const USERS_COLUMN_VISIBILITY = {
  id: false,
  avatar_url: false,
  clerk_user_id: false,
  first_name: false,
  last_name: false,
  bio: false,
  interest_tag_names: false,
  embedding_status: false,
  embedding_updated_at: false,
  created_at: false,
  updated_at: false,
} as const;

export interface UseUsersDataTableOptions
  extends Omit<
    UseDataTableOptions<AdminAPI.User>,
    "columns" | "initialColumnVisibility"
  > {
  callbacks?: RowCallbacks;
}

export function useUsersDataTable(
  options: UseUsersDataTableOptions,
): UseDataTableReturn<AdminAPI.User> {
  const { callbacks, ...rest } = options;
  const tableColumns = useUsersColumns(callbacks);

  return useDataTable({
    ...rest,
    columns: tableColumns,
    initialColumnVisibility: USERS_COLUMN_VISIBILITY,
  });
}

interface UsersDataTableViewProps {
  table: UseDataTableReturn<AdminAPI.User>["table"];
  isLoading?: boolean;
  className?: string;
  callbacks?: RowCallbacks;
  leftColumnVisibilityContent?: React.ReactNode;
  bulkActionsContent?: (selectedRows: AdminAPI.User[]) => React.ReactNode;
  selectionResetKey?: unknown;
}

export function UsersDataTableView({
  table,
  isLoading = false,
  className,
  callbacks,
  leftColumnVisibilityContent = null,
  bulkActionsContent,
  selectionResetKey,
}: UsersDataTableViewProps) {
  const t = useTranslations("dataTable");

  const tableColumns = useUsersColumns(callbacks);

  return (
    <div data-testid="admin-users-table">
      <DataTable
        table={table}
        columns={tableColumns}
        isLoading={isLoading}
        loadingTitle={t("users.loadingTitle")}
        filterColumns="email"
        className={cn(className)}
        leftColumnVisibilityContent={leftColumnVisibilityContent}
        bulkActionsContent={bulkActionsContent}
        getRowClassName={(row) =>
          row.deleted ? "opacity-60 bg-muted/30" : undefined
        }
        selectionResetKey={selectionResetKey}
      />
    </div>
  );
}

type UsersDataTableCommonProps = Omit<
  UsersDataTableViewProps,
  "table"
>;

type UsersDataTableProps = UsersDataTableCommonProps &
  (
    | {
      dataTable: UseDataTableReturn<AdminAPI.User>;
      initialData?: never;
      callbacks?: RowCallbacks;
    }
    | {
      dataTable?: never;
      initialData: AdminAPI.User[];
      callbacks?: RowCallbacks;
    }
  );

function UsersDataTableWithData({
  initialData,
  callbacks,
  ...viewProps
}: UsersDataTableCommonProps & {
  initialData: AdminAPI.User[];
  callbacks?: RowCallbacks;
}) {
  const dataTable = useUsersDataTable({ data: initialData, callbacks });
  return <UsersDataTableView table={dataTable.table} callbacks={callbacks} {...viewProps} />;
}

export function UsersDataTable(props: UsersDataTableProps) {
  if ("dataTable" in props && props.dataTable) {
    const { dataTable, callbacks, ...viewProps } = props;
    return <UsersDataTableView table={dataTable.table} callbacks={callbacks} {...viewProps} />;
  }

  const { initialData, callbacks, ...viewProps } = props;
  return (
    <UsersDataTableWithData
      initialData={initialData!}
      callbacks={callbacks}
      {...viewProps}
    />
  );
}
