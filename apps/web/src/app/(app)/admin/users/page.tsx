'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AdminAPI } from '@/types/admin.types';
import { AppLayout } from '@/components/layouts/app-layout';
import { Button } from '@repo/ui/components/ui/button';
import { IconRefresh } from '@tabler/icons-react';
import { UsersDataTable } from '@/components/data-table/users/data-table'
import { logger } from '@/utils/logger';
import { toast } from "@repo/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import { useUserContext } from '@/components/providers/user/user-provider';
import { useSocket } from '@/hooks/socket/use-socket';

export default function ListUsersPage() {
  const { state } = useUserContext()
  const { adminSocket } = useSocket()
  const { play: playSound } = useSoundWithSettings()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<AdminAPI.User[]>([])
  const queryClient = useQueryClient()

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken()
      setToken(token)
    }
    fetchToken()
  }, [state])

  const { data: users, isFetching, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?all=true`, {
        headers: { Authorization: `Bearer ${token || ''}` }
      });
      if (!res.ok) throw new Error("Failed to load data");
      return res.json() as Promise<AdminAPI.GetUsers.Response>;
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (users) {
      setData(users.data)
    }
  }, [users])

  const updateMutation = useMutation({
    mutationFn: async (payload: Pick<AdminAPI.User, 'id' | 'allow' | 'role'>) => {
      if (!token) return
      const res = await fetch(`/api/admin/users/${payload.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Operation failed" }));
        throw new Error(err.message || err.error || "Operation failed");
      }
      return res.json() as Promise<AdminAPI.User>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'], refetchType: 'active' })
      await refetch();
      playSound('success');
      toast.success("User updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred during update")
    }
  });

  useEffect(() => {
    if (!adminSocket) return

    const onPresenceUpdate = (update: { userId: string; state: string; updatedAt: number }) => {
      console.info('Presence update received', update)
      setData((prevData) => {
        const newState = update.state as AdminAPI.PresenceState
        const user = prevData.find(user => user.clerk_user_id === update.userId)
        if (!user || user.presence === newState) {
          return prevData
        }
        return prevData.map((item) =>
          item.clerk_user_id === update.userId
            ? { ...item, presence: newState }
            : item
        )
      })
    }

    adminSocket.on('presence_update', onPresenceUpdate)
    return () => {
      adminSocket.off('presence_update', onPresenceUpdate)
    }
  }, [adminSocket])

  const tableCallbacks = {
    onSelectAllowState: (user: AdminAPI.User, allow: boolean) => {
      updateMutation.mutate({ ...user, allow })
    },
    onSelectRole: (user: AdminAPI.User, role: AdminAPI.UserRole) => {
      updateMutation.mutate({ ...user, role })
    },
  }

  return (
    <AppLayout label='Users' description='Manage users'>
      <UsersDataTable initialData={data} callbacks={tableCallbacks} leftColumnVisibilityContent={
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      } />
    </AppLayout>
  );
}

