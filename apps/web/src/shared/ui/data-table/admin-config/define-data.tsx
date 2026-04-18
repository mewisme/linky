'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import type { ColumnDef } from '@ws/ui/internal-lib/react-table';
import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

export type RowCallbacks = {
  onUpdate?: (item: AdminAPI.Config.Item) => void;
  onUnset?: (key: string) => void;
};

function formatValue(value: AdminAPI.Config.Item['value']): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function ConfigActionsCell({
  row,
  onUpdate,
  onUnset,
}: {
  row: { original: AdminAPI.Config.Item };
  onUpdate?: (item: AdminAPI.Config.Item) => void;
  onUnset?: (key: string) => void;
}) {
  const t = useTranslations('dataTable')
  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];
    if (onUpdate) {
      items.push({
        type: 'item' as const,
        label: t('adminConfig.update'),
        icon: <IconPencil className="size-4" />,
        onClick: () => onUpdate(row.original),
      });
    }
    if (onUnset) {
      items.push({
        type: 'item' as const,
        label: t('adminConfig.unset'),
        icon: <IconTrash className="size-4" />,
        onClick: () => onUnset(row.original.key),
      });
    }
    return items;
  }, [onUpdate, onUnset, row.original, t]);

  return <ActionsButton actions={actions} title={t('common.actions')} className="flex justify-end" />;
}

export function useAdminConfigColumns(callbacks?: RowCallbacks): ColumnDef<AdminAPI.Config.Item>[] {
  const t = useTranslations('dataTable')
  return useMemo(() => [
    {
      accessorKey: 'key',
      header: t('adminConfig.key'),
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('key')}</div>,
    },
    {
      accessorKey: 'value',
      header: t('adminConfig.value'),
      cell: ({ row }) => (
        <div className="max-w-md truncate font-mono text-sm" title={formatValue(row.original.value)}>
          {formatValue(row.original.value)}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <ConfigActionsCell row={row} onUpdate={callbacks?.onUpdate} onUnset={callbacks?.onUnset} />
      ),
    },
  ], [callbacks, t])
}
