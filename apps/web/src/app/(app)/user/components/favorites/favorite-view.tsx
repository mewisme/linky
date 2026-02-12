'use client'

import { FavoritesDataTable } from "@/components/data-table/favorites/data-table";
import type { ResourcesAPI } from "@/types/resources.types";
import { toast } from "@ws/ui/components/ui/sonner";
import { useState } from "react";
import { useUserTokenContext } from "@/components/providers/user/user-token-provider";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/client-api";

interface FavoritesPageClientProps {
  initialData: ResourcesAPI.Favorites.FavoriteWithStats[];
}

export function FavoritesPageClient({ initialData }: FavoritesPageClientProps) {
  const { token } = useUserTokenContext();
  const [favorites, setFavorites] = useState<ResourcesAPI.Favorites.FavoriteWithStats[]>(initialData);

  const handleRemoveFavorite = async (favorite: ResourcesAPI.Favorites.FavoriteWithStats) => {
    try {
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      if (!favorite.favorite_user_id) {
        console.error("Missing favorite_user_id:", favorite);
        toast.error("Invalid favorite data");
        return;
      }

      const result = await fetchData<{ refunded: boolean }>(
        apiUrl.resources.favoriteByUserId(favorite.favorite_user_id),
        { token: token ?? undefined, method: 'DELETE' }
      );

      setFavorites((prev) => prev.filter((f) => f.favorite_user_id !== favorite.favorite_user_id));

      if (result.refunded) {
        toast.success("Removed from favorites (daily limit refunded)");
      } else {
        toast.success("Removed from favorites");
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to remove favorite";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Favorites</h1>
        <p className="text-muted-foreground mt-2">
          Manage your favorite users and view your match statistics
        </p>
      </div>
      <FavoritesDataTable
        initialData={favorites}
        callbacks={{
          onRemove: handleRemoveFavorite,
        }}
      />
    </div>
  );
}
