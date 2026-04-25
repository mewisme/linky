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
  IconTrashX,
  IconRestore,
} from '@tabler/icons-react';

import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button';
import { toast } from "@ws/ui/components/ui/sonner";
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

type InterestTag = AdminAPI.InterestTags.InterestTag;

export interface RowCallbacks {
  onEdit: (tag: InterestTag) => void
  onActivate: (tag: InterestTag) => void
  onDelete: (tag: InterestTag) => void
  onDeletePermanently: (tag: InterestTag) => void
}

function InterestTagActionsCell({ row, callbacks }: { row: { original: InterestTag }, callbacks?: RowCallbacks }) {
  const t = useTranslations('dataTable')
  const tag = row.original;

  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [
      {
        type: 'item',
        label: t('interestTags.copyTagId'),
        icon: <IconCopy className="size-4" />,
        onClick: () => {
          navigator.clipboard.writeText(tag.id);
          toast.success(t('interestTags.tagIdCopied'));
        },
      },
      {
        type: 'item',
        label: t('interestTags.editDetails'),
        icon: <IconEdit className="size-4" />,
        onClick: () => callbacks?.onEdit(tag),
      },
    ];

    if (!tag.is_active) {
      items.push({
        type: 'item',
        label: t('interestTags.activate'),
        icon: <IconRestore className="size-4" />,
        onClick: () => callbacks?.onActivate(tag),
      });
    }

    items.push({ type: 'separator' });

    if (tag.is_active) {
      items.push({
        type: 'item',
        label: t('interestTags.deactivate'),
        icon: <IconTrash className="size-4" />,
        onClick: () => callbacks?.onDelete(tag),
        variant: 'destructive',
      });
    }

    items.push({
      type: 'item',
      label: t('interestTags.deletePermanently'),
      icon: <IconTrashX className="size-4" />,
      onClick: () => callbacks?.onDeletePermanently(tag),
      variant: 'destructive',
      confirmAction: {
        title: t('confirm.deleteTitle'),
        description: t('interestTags.deletePermanentDescription'),
        confirmLabel: t('confirm.yesDelete'),
        cancelLabel: t('confirm.noGoBack'),
        variant: 'destructive',
      },
    });

    return items;
  }, [tag, callbacks, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} />;
}

export function useInterestTagColumns(callbacks?: RowCallbacks): ColumnDef<InterestTag>[] {
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
      header: t('interestTags.tag'),
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-3">
            <span className="text-xl p-2 bg-muted rounded-lg">{row.original.icon || "🏷️"}</span>
            <span className="font-bold text-foreground">{row.original.name}</span>
          </div>
        )
      }
    },
    {
      accessorKey: 'category',
      header: t('interestTags.category'),
      cell: ({ row }) => {
        return (
          <Badge variant="secondary" className="px-3 py-1 font-medium">{row.original.category || t('interestTags.general')}</Badge>
        )
      }
    },
    {
      accessorKey: 'description',
      header: t('interestTags.description'),
      cell: ({ row }) => {
        return (
          <div className="max-w-[250px] truncate text-muted-foreground italic">{row.original.description || t('interestTags.noDescription')}</div>
        )
      }
    },
    {
      accessorKey: 'is_active',
      header: t('interestTags.status'),
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="text-muted-foreground px-1.5">
            {row.original.is_active ? (
              <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
            ) : (
              <IconCircleXFilled className="fill-red-500 dark:fill-red-400" />
            )}
            {row.original.is_active ? t('interestTags.active') : t('interestTags.inactive')}
          </Badge>
        )
      }
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        return <InterestTagActionsCell row={row} callbacks={callbacks} />;
      }
    }
  ], [callbacks, t])
}
