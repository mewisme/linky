"use client";

import type { ResourcesAPI } from "@/shared/types/resources.types";
import { useFavoritesColumns, type RowCallbacks } from "./define-data";
import { DataTable } from "../data-table";
import { cn } from "@ws/ui/lib/utils";
import { useTranslations } from "next-intl";

interface FavoritesDataTableProps {
  initialData: ResourcesAPI.Favorites.FavoriteWithStats[];
  isLoading?: boolean;
  className?: string;
  callbacks?: RowCallbacks;
  leftColumnVisibilityContent?: React.ReactNode;
}

export function FavoritesDataTable({
  initialData,
  isLoading = false,
  className,
  callbacks,
  leftColumnVisibilityContent = null,
}: FavoritesDataTableProps) {
  const t = useTranslations("dataTable");
  const tableColumns = useFavoritesColumns(callbacks);

  return (
    <DataTable
      filterColumns="name"
      initialData={initialData}
      isLoading={isLoading}
      loadingTitle={t("favorites.loadingTitle")}
      initialColumnVisibility={{ id: false }}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
    />
  );
}
