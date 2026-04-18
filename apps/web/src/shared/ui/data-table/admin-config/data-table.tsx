'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { useAdminConfigColumns, type RowCallbacks } from './define-data';
import { DataTable } from '../data-table';
import { cn } from '@ws/ui/lib/utils';

interface AdminConfigDataTableProps {
  initialData: AdminAPI.Config.Item[];
  className?: string;
  callbacks?: RowCallbacks;
  leftColumnVisibilityContent?: React.ReactNode;
  rightColumnVisibilityContent?: React.ReactNode;
}

export function AdminConfigDataTable({
  initialData,
  className,
  callbacks,
  leftColumnVisibilityContent = null,
  rightColumnVisibilityContent = null,
}: AdminConfigDataTableProps) {
  const tableColumns = useAdminConfigColumns(callbacks);

  return (
    <DataTable
      initialData={initialData}
      initialColumnVisibility={{}}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  );
}
