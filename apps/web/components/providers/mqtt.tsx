'use client'

import { createMqttClient, disconnectMqttClient, publishPresence } from '@/lib/mqtt/client'
import { useEffect, useRef } from 'react'

import { useSupabase } from '@/components/providers/supabase'

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabase()
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!loading) return
    if (!user) return
    if (connectedRef.current) return

    connectedRef.current = true

    let cancelled = false

    async function initMqtt() {
      if (cancelled || !user?.id) return

      createMqttClient(user.id)
    }

    initMqtt()

    return () => {
      publishPresence('offline')
      cancelled = true
    }
  }, [loading, user])

  useEffect(() => {
    if (loading && !user) {
      publishPresence('offline')
      disconnectMqttClient()
      connectedRef.current = false
    }
  }, [loading, user])

  return <>{children}</>
}
