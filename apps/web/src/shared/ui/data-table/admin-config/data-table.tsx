'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { useAdminConfigColumns, type RowCallbacks } from './define-data';
import { DataTable } from '../data-table';
import { cn } from '@ws/ui/lib/utils';
import { useTranslations } from 'next-intl';

interface AdminConfigDataTableProps {
  initialData: AdminAPI.Config.Item[];
  isLoading?: boolean;
  className?: string;
  callbacks?: RowCallbacks;
  leftColumnVisibilityContent?: React.ReactNode;
  rightColumnVisibilityContent?: React.ReactNode;
}

export function AdminConfigDataTable({
  initialData,
  isLoading = false,
  className,
  callbacks,
  leftColumnVisibilityContent = null,
  rightColumnVisibilityContent = null,
}: AdminConfigDataTableProps) {
  const t = useTranslations('dataTable');
  const tableColumns = useAdminConfigColumns(callbacks);

  return (
    <DataTable
      filterColumns='key'
      initialData={initialData}
      isLoading={isLoading}
      loadingTitle={t('adminConfig.loadingTitle')}
      initialColumnVisibility={{}}
      columns={tableColumns}
      className={cn(className)}
      leftColumnVisibilityContent={leftColumnVisibilityContent}
      rightColumnVisibilityContent={rightColumnVisibilityContent}
    />
  );
}
