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

type LevelFeatureUnlock = AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock;

export interface RowCallbacks {
  onEdit: (unlock: LevelFeatureUnlock) => void
  onDelete: (unlock: LevelFeatureUnlock) => void
}

function LevelFeatureUnlockActionsCell({ row, callbacks }: { row: { original: LevelFeatureUnlock }, callbacks?: RowCallbacks }) {
  const t = useTranslations('dataTable')
  const unlock = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: t('levelFeatureUnlocks.copyUnlockId'),
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(unlock.id);
        toast.success(t('levelFeatureUnlocks.unlockIdCopied'));
      },
    },
    {
      type: 'item',
      label: t('levelFeatureUnlocks.editDetails'),
      icon: <IconEdit className="size-4" />,
      onClick: () => callbacks?.onEdit(unlock),
    },
    { type: 'separator' },
    {
      type: 'item',
      label: t('levelFeatureUnlocks.delete'),
      icon: <IconTrash className="size-4" />,
      onClick: () => callbacks?.onDelete(unlock),
      variant: 'destructive',
      confirmAction: {
        title: t('confirm.deleteTitle'),
        description: t('levelFeatureUnlocks.deleteDescription'),
        confirmLabel: t('confirm.yesDelete'),
        cancelLabel: t('confirm.noGoBack'),
        variant: 'destructive',
      },
    },
  ], [unlock, callbacks, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} />;
}

export function useLevelFeatureUnlockColumns(callbacks?: RowCallbacks): ColumnDef<LevelFeatureUnlock>[] {
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
      accessorKey: 'level_required',
      header: t('levelFeatureUnlocks.levelRequired'),
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="px-3 py-1 font-bold text-base">
            {t('levelFeatureUnlocks.levelPrefix', { level: row.original.level_required })}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'feature_key',
      header: t('levelFeatureUnlocks.featureKey'),
      cell: ({ row }) => {
        return (
          <div className="font-medium font-mono">{row.original.feature_key}</div>
        )
      }
    },
    {
      accessorKey: 'feature_payload',
      header: t('levelFeatureUnlocks.featureConfig'),
      cell: ({ row }) => {
        const payload = row.original.feature_payload;
        return (
          <div className="max-w-[300px] truncate text-muted-foreground text-sm">
            {JSON.stringify(payload)}
          </div>
        )
      }
    },
    {
      accessorKey: 'created_at',
      header: t('levelFeatureUnlocks.created'),
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
        return <LevelFeatureUnlockActionsCell row={row} callbacks={callbacks} />;
      }
    }
  ], [callbacks, t])
}
