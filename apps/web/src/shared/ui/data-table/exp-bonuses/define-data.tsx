'use client'

import { formatExpBonusBound } from '@/features/admin/lib/exp-bonus-config'
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

type ExpBonus = AdminAPI.ExpBonuses.ExpBonus;

export interface RowCallbacks {
  onEdit: (bonus: ExpBonus) => void
  onDelete: (bonus: ExpBonus) => void
}

function ExpBonusActionsCell({ row, callbacks }: { row: { original: ExpBonus }, callbacks?: RowCallbacks }) {
  const t = useTranslations('dataTable')
  const bonus = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: t('expBonuses.copyBonusId'),
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(bonus.id);
        toast.success(t('expBonuses.bonusIdCopied'));
      },
    },
    {
      type: 'item',
      label: t('expBonuses.editDetails'),
      icon: <IconEdit className="size-4" />,
      onClick: () => callbacks?.onEdit(bonus),
    },
    { type: 'separator' },
    {
      type: 'item',
      label: t('expBonuses.delete'),
      icon: <IconTrash className="size-4" />,
      onClick: () => callbacks?.onDelete(bonus),
      variant: 'destructive',
      confirmAction: {
        title: t('confirm.deleteTitle'),
        description: t('expBonuses.deleteDescription'),
        confirmLabel: t('confirm.yesDelete'),
        cancelLabel: t('confirm.noGoBack'),
        variant: 'destructive',
      },
    },
  ], [bonus, callbacks, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} />;
}

export function useExpBonusColumns(callbacks?: RowCallbacks): ColumnDef<ExpBonus>[] {
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
      accessorKey: 'type',
      header: t('expBonuses.type'),
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <Badge variant="outline" className="capitalize">
            {type === 'streak' ? t('expBonuses.typeStreak') : t('expBonuses.typeLevel')}
          </Badge>
        )
      }
    },
    {
      id: 'config.min',
      header: t('expBonuses.min'),
      cell: ({ row }) => (
        <div className="font-medium">
          {formatExpBonusBound(row.original.config.min, t('expBonuses.unboundedMin'))}
        </div>
      )
    },
    {
      id: 'config.max',
      header: t('expBonuses.max'),
      cell: ({ row }) => (
        <div className="font-medium">
          {formatExpBonusBound(row.original.config.max, t('expBonuses.unboundedMax'))}
        </div>
      )
    },
    {
      accessorKey: 'bonus_multiplier',
      header: t('expBonuses.bonusMultiplier'),
      cell: ({ row }) => {
        const multiplier = row.original.bonus_multiplier;
        const percentage = ((multiplier - 1) * 100).toFixed(0);
        return (
          <Badge variant="secondary" className="px-3 py-1 font-bold">
            {t('expBonuses.bonusPercent', { multiplier: multiplier.toFixed(2), percent: percentage })}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'created_at',
      header: t('expBonuses.created'),
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
        return <ExpBonusActionsCell row={row} callbacks={callbacks} />;
      }
    }
  ], [callbacks, t])
}
