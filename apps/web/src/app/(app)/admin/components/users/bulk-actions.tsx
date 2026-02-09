'use client';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@ws/ui/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ws/ui/components/animate-ui/components/radix/dropdown-menu';

import type { AdminAPI } from '@/types/admin.types';
import { Button } from '@ws/ui/components/ui/button';
import { IconProps } from '@tabler/icons-react';
import { useIsMobile } from '@ws/ui/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  return (
    <>
      {isMobile ? (
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm">
              Actions
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Bulk Actions</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 flex flex-col gap-2">
              {bulkActions.map((action) => (
                <DrawerClose key={action.label} asChild>
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-start gap-3"
                    onClick={() => action.onClick(selected)}
                  >
                    <action.icon className="w-4 h-4" />
                    <span>{action.label}</span>
                  </Button>
                </DrawerClose>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Actions
            </Button>
          </DropdownMenuTrigger>
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
      )}
    </>
  );
}
