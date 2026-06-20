"use client";

import type { ResourcesAPI } from "@/shared/types/resources.types";
import { useReportColumns, type RowCallbacks } from "./define-data";
import { DataTable } from "../data-table";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";

interface ReportsDataTableProps {
  initialData: ResourcesAPI.Reports.Report[];
  isLoading?: boolean;
  className?: string;
  callbacks?: RowCallbacks;
  leftColumnVisibilityContent?: React.ReactNode;
}

export function ReportsDataTable({
  initialData,
  isLoading = false,
  className,
  callbacks,
  leftColumnVisibilityContent = null,
}: ReportsDataTableProps) {
  const t = useTranslations("dataTable");
  const tableColumns = useReportColumns(callbacks);

  return (
    <DataTable
      initialData={initialData}
      isLoading={isLoading}
      loadingTitle={t("reports.loadingTitle")}
      initialColumnVisibility={{}}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
    />
  );
}
