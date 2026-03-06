'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import type { ColumnDef } from '@ws/ui/internal-lib/react-table';
import { ActionsButton, type ActionItem } from '@/shared/ui/common/actions-button';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { useMemo } from 'react';

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
  const actions: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];
    if (onUpdate) {
      items.push({
        type: 'item' as const,
        label: 'Update',
        icon: <IconPencil className="size-4" />,
        onClick: () => onUpdate(row.original),
      });
    }
    if (onUnset) {
      items.push({
        type: 'item' as const,
        label: 'Unset',
        icon: <IconTrash className="size-4" />,
        onClick: () => onUnset(row.original.key),
      });
    }
    return items;
  }, [onUpdate, onUnset, row.original]);

  return <ActionsButton actions={actions} title="Actions" className="flex justify-end" />;
}

export function columns(callbacks?: RowCallbacks): ColumnDef<AdminAPI.Config.Item>[] {
  return [
    {
      accessorKey: 'key',
      header: 'Key',
      cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('key')}</div>,
    },
    {
      accessorKey: 'value',
      header: 'Value',
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
  ];
}
