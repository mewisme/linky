'use client'

import { CountryFlag } from "@/shared/ui/common/country-flag";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import { Checkbox } from "@ws/ui/components/ui/checkbox";
import { type ColumnDef } from "@ws/ui/internal-lib/react-table";
import { IconTrash } from "@tabler/icons-react";
import { formatDuration } from "@/entities/call-history/utils/call-history";
import { ActionsButton, type ActionItem } from "@/shared/ui/common/actions-button";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

export interface RowCallbacks {
  onRemove?: (favorite: ResourcesAPI.Favorites.FavoriteWithStats) => void;
}

function FavoritesActionsCell({ row, callbacks }: { row: { original: ResourcesAPI.Favorites.FavoriteWithStats }; callbacks?: RowCallbacks }) {
  const t = useTranslations('dataTable')
  const favorite = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: t('favorites.removeFromFavorites'),
      icon: <IconTrash className="size-4" />,
      onClick: () => callbacks?.onRemove?.(favorite),
      variant: 'destructive',
    },
  ], [favorite, callbacks, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} className="flex justify-end" />;
}

export function useFavoritesColumns(callbacks?: RowCallbacks): ColumnDef<ResourcesAPI.Favorites.FavoriteWithStats>[] {
  const t = useTranslations('dataTable')
  return useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('common.selectAllAria')}
          className='justify-center flex'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('common.selectRowAria')}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "favorite_user",
      header: t('favorites.user'),
      cell: ({ row }) => {
        const name = `${row.original.first_name || ""} ${row.original.last_name || ""}`.trim() || t('common.unknownUser');
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={row.original.avatar_url || ""} alt={name} />
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{name}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CountryFlag countryCode={row.original.country || ""} /> {row.original.country}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: "match_count",
      header: t('favorites.matches'),
      cell: ({ row }) => {
        return (
          <span className="font-medium">{row.original.match_count}</span>
        )
      }
    },
    {
      accessorKey: "total_duration",
      header: t('favorites.totalDuration'),
      cell: ({ row }) => {
        return (
          <span className="font-medium text-primary">{formatDuration(row.original.total_duration || 0)}</span>
        )
      }
    },
    {
      accessorKey: "average_duration",
      header: t('favorites.avgDuration'),
      cell: ({ row }) => {
        return (
          <span className="font-medium text-muted-foreground">{formatDuration(Math.round(row.original.average_duration || 0))}</span>
        )
      }
    },
    {
      accessorKey: "created_at",
      header: t('favorites.added'),
      cell: ({ row }) => {
        return (
          <span className="text-muted-foreground text-sm">{new Date(row.original.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        )
      }
    },
    {
      id: "actions",
      cell: ({ row }) => <FavoritesActionsCell row={row} callbacks={callbacks} />,
    }
  ], [callbacks, t])
}
