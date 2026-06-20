"use client";

import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import {
  resolveActionErrorMessage,
  resolveActionSuccessMessage,
} from "@/shared/lib/i18n/resolve-action-error-message";
import { useEffect, useState } from "react";

import { AppLayout } from "@/shared/ui/layouts/app-layout";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import dynamic from "next/dynamic";
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useQuery } from "@ws/ui/internal-lib/react-query";
import { DataTableRefreshButton } from "@/shared/ui/data-table/refresh-button";

const FavoritesDataTable = dynamic(() =>
  import("@/shared/ui/data-table/favorites/data-table").then((mod) => ({
    default: mod.FavoritesDataTable,
  })),
);

interface FavoritesClientProps {
  initialData: ResourcesAPI.Favorites.Get.Response;
}

export function FavoritesClient({ initialData }: FavoritesClientProps) {
  const t = useTranslations("user");
  const tRoot = useTranslations();
  const [data, setData] = useState<ResourcesAPI.Favorites.FavoriteWithStats[]>(
    initialData.data,
  );

  const {
    data: favorites,
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["user-favorites"],
    queryFn: () =>
      fetchFromActionRoute<ResourcesAPI.Favorites.Get.Response>(
        "/api/resources/favorites",
      ),
    initialData,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (favorites) {
      setData(favorites.data);
    }
  }, [favorites]);

  const handleRemoveFavorite = async (
    favorite: ResourcesAPI.Favorites.FavoriteWithStats,
  ) => {
    if (!favorite.favorite_user_id) {
      toast.error(t("invalidFavoriteData"));
      return;
    }

    try {
      const result =
        await fetchFromActionRoute<ResourcesAPI.Favorites.Delete.Response>(
          `/api/resources/favorites/${encodeURIComponent(favorite.favorite_user_id)}`,
          { method: "DELETE" },
        );

      setData((prev) =>
        prev.filter((f) => f.favorite_user_id !== favorite.favorite_user_id),
      );

      toast.success(
        resolveActionSuccessMessage(
          result,
          tRoot,
          "api.favoriteRemovedSuccess",
        ),
      );
    } catch (error) {
      toast.error(
        resolveActionErrorMessage(error, tRoot, "user.removeFavoriteFailed"),
      );
    }
  };

  return (
    <AppLayout
      label={t("favoritesTitle")}
      description={t("favoritesDescription")}
    >
      <FavoritesDataTable
        initialData={data}
        isLoading={isPending}
        callbacks={{
          onRemove: handleRemoveFavorite,
        }}
        leftColumnVisibilityContent={
          <DataTableRefreshButton
            onClick={() => refetch()}
            isFetching={isFetching}
          />
        }
      />
    </AppLayout>
  );
}
