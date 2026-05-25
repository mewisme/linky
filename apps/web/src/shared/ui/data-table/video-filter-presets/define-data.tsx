'use client'

import { AdminAPI } from '@/features/admin/types/admin.types'
import { Badge } from '@ws/ui/components/ui/badge';
import { Checkbox } from '@ws/ui/components/ui/checkbox';
import { type ColumnDef } from "@ws/ui/internal-lib/react-table"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconCopy,
  IconEdit,
  IconTrash,
} from '@tabler/icons-react';

import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button';
import { toast } from "@ws/ui/components/ui/sonner";
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

type VideoFilterPreset = AdminAPI.VideoFilterPresets.VideoFilterPreset;

export interface RowCallbacks {
  onEdit: (preset: VideoFilterPreset) => void
  onDelete: (preset: VideoFilterPreset) => void
}

function VideoFilterPresetActionsCell({ row, callbacks }: { row: { original: VideoFilterPreset }, callbacks?: RowCallbacks }) {
  const t = useTranslations('dataTable')
  const preset = row.original;

  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [
      {
        type: 'item',
        label: t('videoFilterPresets.copyPresetId'),
        icon: <IconCopy className="size-4" />,
        onClick: () => {
          navigator.clipboard.writeText(preset.id);
          toast.success(t('videoFilterPresets.presetIdCopied'));
        },
      },
      {
        type: 'item',
        label: t('videoFilterPresets.editDetails'),
        icon: <IconEdit className="size-4" />,
        onClick: () => callbacks?.onEdit(preset),
      },
      { type: 'separator' },
      {
        type: 'item',
        label: t('videoFilterPresets.deletePreset'),
        icon: <IconTrash className="size-4" />,
        onClick: () => callbacks?.onDelete(preset),
        variant: 'destructive',
        confirmAction: {
          title: t('confirm.deleteTitle'),
          description: t('videoFilterPresets.deleteDescription'),
          confirmLabel: t('confirm.yesDelete'),
          cancelLabel: t('confirm.noGoBack'),
          variant: 'destructive',
        },
      },
    ];

    return items;
  }, [preset, callbacks, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} />;
}

export function useVideoFilterPresetColumns(callbacks?: RowCallbacks): ColumnDef<VideoFilterPreset>[] {
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
      accessorKey: 'name',
      header: t('videoFilterPresets.name'),
    },
    {
      accessorKey: 'slug',
      header: t('videoFilterPresets.slug'),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">{row.original.slug}</span>
      ),
    },
    {
      accessorKey: 'description',
      header: t('videoFilterPresets.description'),
      cell: ({ row }) => (
        <div className="max-w-[250px] truncate text-muted-foreground">{row.original.description || t('common.emDash')}</div>
      ),
    },
    {
      accessorKey: 'sort_order',
      header: t('videoFilterPresets.sortOrder'),
    },
    {
      accessorKey: 'is_active',
      header: t('videoFilterPresets.status'),
      cell: ({ row }) => (
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.is_active ? (
            <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
          ) : (
            <IconCircleXFilled className="fill-red-500 dark:fill-red-400" />
          )}
          {row.original.is_active ? t('videoFilterPresets.active') : t('videoFilterPresets.inactive')}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <VideoFilterPresetActionsCell row={row} callbacks={callbacks} />
      ),
    }
  ], [callbacks, t])
}
