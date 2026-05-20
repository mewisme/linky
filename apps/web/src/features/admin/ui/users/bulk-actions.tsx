'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ws/ui/components/animate-ui/components/radix/dropdown-menu';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { Button } from '@ws/ui/components/ui/button';
import { IconProps, IconDotsVertical } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { SimpleTooltip } from '@/shared/ui/common/simple-tooltip';

export interface BulkAction {
  label: string;
  icon: React.ComponentType<IconProps>;
  onClick: (selected: AdminAPI.User[]) => void;
}

interface BulkActionsProps {
  bulkActions: BulkAction[];
  selected: AdminAPI.User[];
}

export function BulkActions({ bulkActions, selected }: BulkActionsProps) {
  const tc = useTranslations('common');

  return (
    <DropdownMenu>
      <SimpleTooltip content={tc('actionsMenu')}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <IconDotsVertical className="w-4 h-4" />
            <span className="hidden lg:inline-block">{tc('actionsMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
      </SimpleTooltip>
      <DropdownMenuContent>
        {bulkActions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={() => action.onClick(selected)}
            disabled={!selected.length}
          >
            <action.icon className="w-4 h-4" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
