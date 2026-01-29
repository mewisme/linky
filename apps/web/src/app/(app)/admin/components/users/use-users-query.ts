'use client';

import { useEffect, useState } from 'react';

import type { AdminAPI } from '@/types/admin.types';
import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/components/providers/user/user-provider';

export function useUsersQuery() {
  const { state } = useUserContext();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const t = await state.getToken();
      setToken(t);
    };
    fetchToken();
  }, [state]);

  const query = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?all=true`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      if (!res.ok) throw new Error('Failed to load data');
      return res.json() as Promise<AdminAPI.GetUsers.Response>;
    },
    enabled: !!token,
  });

  return {
    token,
    users: query.data?.data ?? [],
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
