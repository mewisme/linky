import { useAuth } from '@clerk/nextjs';
import { useAuthStore } from '@/stores/auth-store';
import { useEffect } from 'react';

export function useAuthClient() {
  const { getToken } = useAuth();
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    let mounted = true;

    const fetchToken = async () => {
      const token = await getToken();
      if (mounted) setToken(token ?? null);
    };

    fetchToken();
    const interval = setInterval(fetchToken, 60_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getToken, setToken]);
}
