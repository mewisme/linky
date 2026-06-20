"use client";

import { AdminAPI } from "@/features/admin/types/admin.types";
import { useExpBonusColumns, type RowCallbacks } from "./define-data";
import { DataTable } from "../data-table";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";

interface ExpBonusesDataTableProps {
  initialData: AdminAPI.ExpBonuses.ExpBonus[];
  isLoading?: boolean;
  className?: string;
  callbacks?: RowCallbacks;
  leftColumnVisibilityContent?: React.ReactNode;
  rightColumnVisibilityContent?: React.ReactNode;
}

export function ExpBonusesDataTable({
  initialData,
  isLoading = false,
  className,
  callbacks,
  leftColumnVisibilityContent = null,
  rightColumnVisibilityContent = null,
}: ExpBonusesDataTableProps) {
  const t = useTranslations("dataTable");
  const tableColumns = useExpBonusColumns(callbacks);

  return (
    <DataTable
      initialData={initialData}
      isLoading={isLoading}
      loadingTitle={t("expBonuses.loadingTitle")}
      filterColumns="type"
      filterPlaceholder={t("expBonuses.filterPlaceholder")}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  );
}
