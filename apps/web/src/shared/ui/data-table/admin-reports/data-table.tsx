"use client";

import type { AdminAPI } from "@/features/admin/types/admin.types";
import { useAdminReportsColumns, type RowCallbacks } from "./define-data";
import { DataTable } from "../data-table";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";

interface AdminReportsDataTableProps {
  initialData: AdminAPI.Reports.Report[];
  isLoading?: boolean;
  className?: string;
  callbacks?: RowCallbacks;
  leftColumnVisibilityContent?: React.ReactNode;
  rightColumnVisibilityContent?: React.ReactNode;
}

export function AdminReportsDataTable({
  initialData,
  isLoading = false,
  className,
  callbacks,
  leftColumnVisibilityContent = null,
  rightColumnVisibilityContent = null,
}: AdminReportsDataTableProps) {
  const t = useTranslations("dataTable");
  const tableColumns = useAdminReportsColumns(callbacks);

  return (
    <DataTable
      initialData={initialData}
      isLoading={isLoading}
      loadingTitle={t("adminReports.loadingTitle")}
      filterColumns="reason"
      filterPlaceholder={t("adminReports.filterPlaceholder")}
      initialColumnVisibility={{
        reviewed_by: false,
      }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  );
}
