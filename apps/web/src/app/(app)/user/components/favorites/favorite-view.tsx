'use client'

import { FavoritesDataTable } from "@/components/data-table/favorites/data-table";
import type { ResourcesAPI } from "@/types/resources.types";
import { logger } from "@/utils/logger";
import { toast } from "@repo/ui/components/ui/sonner";
import { useState } from "react";
import { useUserContext } from "@/components/providers/user";

interface FavoritesPageClientProps {
  initialData: ResourcesAPI.Favorites.FavoriteWithStats[];
}

export function FavoritesPageClient({ initialData }: FavoritesPageClientProps) {
  const { state } = useUserContext();
  const [favorites, setFavorites] = useState<ResourcesAPI.Favorites.FavoriteWithStats[]>(initialData);

  const handleRemoveFavorite = async (favorite: ResourcesAPI.Favorites.FavoriteWithStats) => {
    try {
      const token = await state.getToken();
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      if (!favorite.favorite_user_id) {
        logger.error("Missing favorite_user_id:", favorite);
        toast.error("Invalid favorite data");
        return;
      }

      const response = await fetch(`/api/resources/favorites/${favorite.favorite_user_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || "Failed to remove favorite");
        return;
      }

      setFavorites((prev) => prev.filter((f) => f.favorite_user_id !== favorite.favorite_user_id));

      const result = await response.json();
      if (result.refunded) {
        toast.success("Removed from favorites (daily limit refunded)");
      } else {
        toast.success("Removed from favorites");
      }
    } catch (error) {
      logger.error("Failed to remove favorite:", error);
      toast.error("Failed to remove favorite");
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
