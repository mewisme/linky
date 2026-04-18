'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ws/ui/components/animate-ui/components/radix/alert-dialog';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { useTranslations } from 'next-intl';

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUsers: AdminAPI.User[];
  onConfirm: () => void;
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  pendingUsers,
  onConfirm,
}: BulkDeleteDialogProps) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('bulkDeleteUsersTitle', { count: pendingUsers.length })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('bulkDeleteUsersDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
          >
            {t('bulkActionDelete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
