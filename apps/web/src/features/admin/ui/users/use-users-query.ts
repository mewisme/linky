'use client';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { useQuery } from "@ws/ui/internal-lib/react-query";
import { getAdminUsers } from '@/features/admin/api/users';

interface UseUsersQueryOptions {
  initialData?: AdminAPI.GetUsers.Response;
}

export function useUsersQuery(options?: UseUsersQueryOptions) {
  const query = useQuery({
    queryKey: ['users'],
    queryFn: () => getAdminUsers(new URLSearchParams({ all: 'true' })),
    initialData: options?.initialData,
    staleTime: Infinity,
  });

  return {
    users: query.data?.data ?? [],
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
