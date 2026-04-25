'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { Badge } from '@ws/ui/components/ui/badge';
import { Checkbox } from '@ws/ui/components/ui/checkbox';
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import {
  IconCopy,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';

import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button';
import { toast } from "@ws/ui/components/ui/sonner";
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

type StreakExpBonus = AdminAPI.StreakExpBonuses.StreakExpBonus;

export interface RowCallbacks {
  onEdit: (bonus: StreakExpBonus) => void
  onDelete: (bonus: StreakExpBonus) => void
}

function StreakExpBonusActionsCell({ row, callbacks }: { row: { original: StreakExpBonus }, callbacks?: RowCallbacks }) {
  const t = useTranslations('dataTable')
  const bonus = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: t('streakExpBonuses.copyBonusId'),
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(bonus.id);
        toast.success(t('streakExpBonuses.bonusIdCopied'));
      },
    },
    {
      type: 'item',
      label: t('streakExpBonuses.editDetails'),
      icon: <IconEdit className="size-4" />,
      onClick: () => callbacks?.onEdit(bonus),
    },
    { type: 'separator' },
    {
      type: 'item',
      label: t('streakExpBonuses.delete'),
      icon: <IconTrash className="size-4" />,
      onClick: () => callbacks?.onDelete(bonus),
      variant: 'destructive',
      confirmAction: {
        title: t('confirm.deleteTitle'),
        description: t('streakExpBonuses.deleteDescription'),
        confirmLabel: t('confirm.yesDelete'),
        cancelLabel: t('confirm.noGoBack'),
        variant: 'destructive',
      },
    },
  ], [bonus, callbacks, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} />;
}

export function useStreakExpBonusColumns(callbacks?: RowCallbacks): ColumnDef<StreakExpBonus>[] {
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
      accessorKey: 'min_streak',
      header: t('streakExpBonuses.minStreak'),
      cell: ({ row }) => {
        return (
          <div className="font-medium">{row.original.min_streak}</div>
        )
      }
    },
    {
      accessorKey: 'max_streak',
      header: t('streakExpBonuses.maxStreak'),
      cell: ({ row }) => {
        return (
          <div className="font-medium">{row.original.max_streak}</div>
        )
      }
    },
    {
      accessorKey: 'bonus_multiplier',
      header: t('streakExpBonuses.bonusMultiplier'),
      cell: ({ row }) => {
        const multiplier = row.original.bonus_multiplier;
        const percentage = ((multiplier - 1) * 100).toFixed(0);
        return (
          <Badge variant="secondary" className="px-3 py-1 font-bold">
            {t('streakExpBonuses.bonusPercent', { multiplier: multiplier.toFixed(2), percent: percentage })}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'created_at',
      header: t('streakExpBonuses.created'),
      cell: ({ row }) => {
        return (
          <div className="text-sm text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString()}
          </div>
        )
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return <StreakExpBonusActionsCell row={row} callbacks={callbacks} />;
      }
    }
  ], [callbacks, t])
}
