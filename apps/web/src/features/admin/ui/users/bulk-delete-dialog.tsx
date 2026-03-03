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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {pendingUsers.length} user(s)?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Users will be removed from Clerk.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
