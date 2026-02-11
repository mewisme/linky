'use client';

import type { AdminAPI } from '@/types/admin.types';
import { useQuery } from '@tanstack/react-query';
import { useUserTokenContext } from '@/components/providers/user/user-token-provider';
import { apiUrl } from '@/lib/api/fetch/api-url';
import { fetchData } from '@/lib/api/fetch/client-api';

interface UseUsersQueryOptions {
  initialData?: AdminAPI.GetUsers.Response;
}

export function useUsersQuery(options?: UseUsersQueryOptions) {
  const { token } = useUserTokenContext();

  const query = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const params = new URLSearchParams({ all: 'true' });
      return fetchData<AdminAPI.GetUsers.Response>(
        apiUrl.admin.users(params),
        {
          token: token ?? undefined,
        }
      );
    },
    initialData: options?.initialData,
  });

  return {
    token,
    users: query.data?.data ?? [],
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
