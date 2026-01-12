'use client';

import { useEffect, useRef, useState } from 'react';

import { AdminAPI } from '@/types/api.types';
import { AppLayout } from '@/components/layouts/app-layout';
import { DataTable } from '../components/data-table'
import type { Socket } from 'socket.io-client';
import { client } from '@/lib/client';
import { createSocket } from '@/lib/socket';
import { logger } from '@/utils/logger';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/nextjs';

export default function ListUsersPage() {
  const { getToken, isLoaded } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<AdminAPI.User[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken({ template: 'custom', skipCache: true })
      setToken(token)
    }
    fetchToken()
  }, [getToken])


  useEffect(() => {
    const fetchData = async () => {
      if (!token || !isLoaded) return
      const response = await client.get<AdminAPI.GetUsers.Response>('/api/admin/users', {
        params: {
          all: true,
        },
        headers: {
          Authorization: `Bearer ${token || ''}`,
        }
      })
      setData(response.data.data)
    }
    fetchData()
  }, [token, isLoaded])

  // Set up socket connection to listen for presence updates
  useEffect(() => {
    if (!token || !isLoaded) return

    let mounted = true

    const setupSocket = async () => {
      try {
        const socket = await createSocket(token)
        socketRef.current = socket

        socket.on('connect', () => {
          logger.info('Admin socket connected')
        })

        socket.on('presence_update', (update: { userId: string; state: string; updatedAt: number }) => {
          if (!mounted) return

          logger.info('Presence update received', update)

          setData((prevData) => {
            const newState = update.state as AdminAPI.PresenceState
            const user = prevData.find(user => user.clerk_user_id === update.userId)

            // Skip if user not found or presence hasn't changed
            if (!user || user.presence === newState) {
              return prevData
            }

            // Only update if presence actually changed
            return prevData.map((item) =>
              item.clerk_user_id === update.userId
                ? { ...item, presence: newState }
                : item
            )
          })
        })

        socket.on('disconnect', () => {
          logger.info('Admin socket disconnected')
        })

        socket.on('connect_error', (error) => {
          logger.error('Admin socket connection error', error)
        })
      } catch (error) {
        logger.error('Failed to setup admin socket', error)
      }
    }

    setupSocket()

    return () => {
      mounted = false
      if (socketRef.current) {
        socketRef.current.removeAllListeners()
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [token, isLoaded])

  const handleSelectAllowState = async (userId: string, allow: boolean) => {
    try {
      if (!token || !isLoaded) return
      const message = allow ? 'Allow state set to true' : 'Allow state set to false'
      await client.put<AdminAPI.UpdateUser.Response>(`/api/admin/users/${userId}`,
        {
          allow,
        },
        {
          headers: {
            Authorization: `Bearer ${token || ''}`,
          },
        }
      )
      setData(prevData => prevData.map(user => user.id === userId ? { ...user, allow } : user))
      toast.success(message)
    } catch (error) {
      logger.error('Error toggling allow', { error })
    }
  }

  const handleSelectRole = async (userId: string, role: AdminAPI.UserRole) => {
    try {
      if (!token || !isLoaded) return
      await client.put<AdminAPI.UpdateUser.Response>(`/api/admin/users/${userId}`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${token || ''}`,
          },
        }
      )
      setData(prevData => prevData.map(user => user.id === userId ? { ...user, role } : user))
      toast.success(`Role updated to ${role}`)
    } catch (error) {
      logger.error('Error selecting role', { error })
    }
  }

  const tableCallbacks = {
    onSelectAllowState: handleSelectAllowState,
    onSelectRole: handleSelectRole,
  }

  return (
    <AppLayout label='Users' description='Manage users'>
      <DataTable initialData={data} callbacks={tableCallbacks} />
    </AppLayout>
  );
}

