'use client'

import { formatExpBonusBound } from '@/features/admin/lib/exp-bonus-config'
import { AdminAPI } from '@/features/admin/types/admin.types'
import { Badge } from '@ws/ui/components/ui/badge';
import { Checkbox } from '@ws/ui/components/ui/checkbox';
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import {
  IconCopy,
  IconEdit,
  IconFlame,
  IconHeart,
  IconStar,
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
  const tc = useTranslations('common')
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
      label: tc('editDetails'),
      icon: <IconEdit className="size-4" />,
      onClick: () => callbacks?.onEdit(bonus),
    },
    { type: 'separator' },
    {
      type: 'item',
      label: tc('delete'),
      icon: <IconTrash className="size-4" />,
      onClick: () => callbacks?.onDelete(bonus),
      variant: 'destructive',
      confirmAction: {
        title: t('confirm.deleteTitle'),
        description: tc('cannotUndo'),
        confirmLabel: t('confirm.yesDelete'),
        cancelLabel: t('confirm.noGoBack'),
        variant: 'destructive',
      },
    },
  ], [bonus, callbacks, t]);

  return <ActionsButton actions={actions} title={tc('actions')} />;
}

function ExpBonusTypeBadge({
  type,
  labels,
}: {
  type: string;
  labels: {
    streak: string;
    level: string;
    favorite: string;
  };
}) {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'streak') {
    return (
      <Badge variant="outline" className="gap-1 border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-400">
        <IconFlame className="size-3.5 shrink-0" aria-hidden />
        {labels.streak}
      </Badge>
    );
  }
  if (normalized === 'level') {
    return (
      <Badge variant="outline" className="gap-1 border-yellow-500/40 bg-yellow-500/10 text-yellow-800 dark:text-yellow-400">
        <IconStar className="size-3.5 shrink-0" aria-hidden />
        {labels.level}
      </Badge>
    );
  }
  if (normalized === 'favorite') {
    return (
      <Badge variant="outline" className="gap-1 border-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-400">
        <IconHeart className="size-3.5 shrink-0" aria-hidden />
        {labels.favorite}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="capitalize">
      {type || '—'}
    </Badge>
  );
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
      id: 'type',
      accessorFn: (row) => {
        const type = String(row.type).trim().toLowerCase();
        if (type === 'streak') {
          return `streak ${t('expBonuses.typeStreak')}`;
        }
        if (type === 'level') {
          return `level ${t('expBonuses.typeLevel')}`;
        }
        if (type === 'favorite') {
          return `favorite favorites ${t('expBonuses.typeFavorite')}`;
        }
        return type;
      },
      header: t('expBonuses.type'),
      cell: ({ row }) => (
        <ExpBonusTypeBadge
          type={String(row.original.type ?? '')}
          labels={{
            streak: t('expBonuses.typeStreak'),
            level: t('expBonuses.typeLevel'),
            favorite: t('expBonuses.typeFavorite'),
          }}
        />
      ),
    },
    {
      id: 'config.range',
      header: t('expBonuses.range'),
      cell: ({ row }) => {
        const { type, config } = row.original;
        if (type === 'favorite') {
          const rel =
            config.relation === 'mutual'
              ? t('expBonuses.relationMutual')
              : config.relation === 'one_way'
                ? t('expBonuses.relationOneWay')
                : '—';
          return <div className="font-medium">{rel}</div>;
        }
        const min = formatExpBonusBound(config.min, t('expBonuses.unboundedMin'));
        const max = formatExpBonusBound(config.max, t('expBonuses.unboundedMax'));
        return (
          <div className="font-medium">
            {min} – {max}
          </div>
        );
      },
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
