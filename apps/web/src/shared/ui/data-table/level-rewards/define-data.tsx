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

type LevelReward = AdminAPI.LevelRewards.LevelReward;

export interface RowCallbacks {
  onEdit: (reward: LevelReward) => void
  onDelete: (reward: LevelReward) => void
}

function LevelRewardActionsCell({ row, callbacks }: { row: { original: LevelReward }, callbacks?: RowCallbacks }) {
  const t = useTranslations('dataTable')
  const reward = row.original;

  const actions: ActionItem[] = useMemo(() => [
    {
      type: 'item',
      label: t('levelRewards.copyRewardId'),
      icon: <IconCopy className="size-4" />,
      onClick: () => {
        navigator.clipboard.writeText(reward.id);
        toast.success(t('levelRewards.rewardIdCopied'));
      },
    },
    {
      type: 'item',
      label: t('levelRewards.editDetails'),
      icon: <IconEdit className="size-4" />,
      onClick: () => callbacks?.onEdit(reward),
    },
    { type: 'separator' },
    {
      type: 'item',
      label: t('levelRewards.delete'),
      icon: <IconTrash className="size-4" />,
      onClick: () => callbacks?.onDelete(reward),
      variant: 'destructive',
      confirmAction: {
        title: t('confirm.deleteTitle'),
        description: t('levelRewards.deleteDescription'),
        confirmLabel: t('confirm.yesDelete'),
        cancelLabel: t('confirm.noGoBack'),
        variant: 'destructive',
      },
    },
  ], [reward, callbacks, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} />;
}

export function useLevelRewardColumns(callbacks?: RowCallbacks): ColumnDef<LevelReward>[] {
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
      header: t('levelRewards.levelRequired'),
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="px-3 py-1 font-bold text-base">
            {t('levelRewards.levelPrefix', { level: row.original.level_required })}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'reward_type',
      header: t('levelRewards.rewardType'),
      cell: ({ row }) => {
        return (
          <div className="font-medium">{row.original.reward_type}</div>
        )
      }
    },
    {
      accessorKey: 'reward_payload',
      header: t('levelRewards.rewardDetails'),
      cell: ({ row }) => {
        const payload = row.original.reward_payload;
        return (
          <div className="max-w-[300px] truncate text-muted-foreground text-sm">
            {JSON.stringify(payload)}
          </div>
        )
      }
    },
    {
      accessorKey: 'created_at',
      header: t('levelRewards.created'),
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
        return <LevelRewardActionsCell row={row} callbacks={callbacks} />;
      }
    }
  ], [callbacks, t])
}
