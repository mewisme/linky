'use client'

import { createMqttClient, disconnectMqttClient, publishPresence } from '@/lib/mqtt/client'
import { useEffect, useRef } from 'react'

import { useAuth } from '@clerk/nextjs'

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken, isLoaded, userId } = useAuth()
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) return
    if (!userId) return
    if (connectedRef.current) return

    connectedRef.current = true

    let cancelled = false

    async function initMqtt() {
      if (cancelled || !userId) return

      createMqttClient(userId)
    }

    initMqtt()

    return () => {
      publishPresence('offline')
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId, getToken])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      publishPresence('offline')
      disconnectMqttClient()
      connectedRef.current = false
    }
  }, [isLoaded, isSignedIn])

  return <>{children}</>
}
