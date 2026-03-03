'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { getAdminUsers } from '@/features/admin/api/users';
import { useQuery } from "@ws/ui/internal-lib/react-query";

export type UsersDeletedFilter = 'active' | 'deleted';

interface UseUsersQueryOptions {
  initialData?: AdminAPI.GetUsers.Response;
  deletedFilter?: UsersDeletedFilter;
}

export function useUsersQuery(options?: UseUsersQueryOptions) {
  const deletedFilter = options?.deletedFilter ?? 'active';
  const query = useQuery({
    queryKey: ['users', deletedFilter],
    queryFn: () =>
      getAdminUsers({
        deleted: deletedFilter === 'deleted' ? 'true' : 'false',
      }),
    initialData: deletedFilter === 'active' ? options?.initialData : undefined,
    staleTime: Infinity,
  });

  return {
    users: query.data?.data ?? [],
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
