'use client'

import { FavoritesDataTable } from "@/shared/ui/data-table/favorites/data-table";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { removeFavorite } from "@/actions/resources/favorites";
import { toast } from "@ws/ui/components/ui/sonner";
import { useState } from "react";

interface FavoritesPageClientProps {
  initialData: ResourcesAPI.Favorites.FavoriteWithStats[];
}

export function FavoritesPageClient({ initialData }: FavoritesPageClientProps) {
  const [favorites, setFavorites] = useState<ResourcesAPI.Favorites.FavoriteWithStats[]>(initialData);

  const handleRemoveFavorite = async (favorite: ResourcesAPI.Favorites.FavoriteWithStats) => {
    try {
      if (!favorite.favorite_user_id) {
        toast.error("Invalid favorite data");
        return;
      }

      const result = await removeFavorite(favorite.favorite_user_id);

      setFavorites((prev) => prev.filter((f) => f.favorite_user_id !== favorite.favorite_user_id));

      if (result.refunded) {
        toast.success("Removed from favorites (daily limit refunded)");
      } else {
        toast.success("Removed from favorites");
      }
    } catch (error) {
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
