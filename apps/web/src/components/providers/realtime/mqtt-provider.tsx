'use client'

import { createMqttClient, disconnectMqttClient, publishPresence } from '@/lib/mqtt/client'
import { useEffect, useRef } from 'react'

import { useUserContext } from "@/components/providers/user/user-provider";

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const { auth: { isSignedIn, isLoaded, userId } } = useUserContext();
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !userId) {
      if (connectedRef.current) {
        publishPresence('offline')
        disconnectMqttClient()
        connectedRef.current = false
      }
      return
    }

    if (connectedRef.current) return

    connectedRef.current = true
    createMqttClient(userId)

    return () => {
      publishPresence('offline')
      disconnectMqttClient()
      connectedRef.current = false
    }
  }, [isLoaded, isSignedIn, userId])

  return <>{children}</>
}
