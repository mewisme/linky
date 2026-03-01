'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ContextMenuItemType } from '../context-menu'

export const PROFILE_EDIT_FIELD_IDS = [
  'name',
  'country',
  'bio',
  'dateOfBirth',
  'gender',
  'interestTags',
] as const

export type ProfileEditFieldId = (typeof PROFILE_EDIT_FIELD_IDS)[number]

export const FIELD_LABELS: Record<ProfileEditFieldId, string> = {
  name: 'Edit Name',
  country: 'Edit Country',
  bio: 'Edit Bio',
  dateOfBirth: 'Edit Date of Birth',
  gender: 'Edit Gender',
  interestTags: 'Edit Interest Tags',
}

interface FieldEntry {
  id: string
  label: string
}

interface ProfileEditContextValue {
  register: (fieldId: ProfileEditFieldId, label: string, onClick: () => void) => void
  unregister: (fieldId: ProfileEditFieldId) => void
  enterEditMode: (fieldId: ProfileEditFieldId) => void
  getMenuItems: () => ContextMenuItemType[]
  version: number
}

const ProfileEditContext = createContext<ProfileEditContextValue | null>(null)

export function ProfileEditProvider({ children }: { children: React.ReactNode }) {
  const callbacksRef = useRef<Partial<Record<ProfileEditFieldId, () => void>>>({})
  const fieldsRef = useRef<FieldEntry[]>([])
  const [version, setVersion] = useState(0)

  const register = useCallback(
    (fieldId: ProfileEditFieldId, label: string, onClick: () => void) => {
      callbacksRef.current[fieldId] = onClick
      if (fieldsRef.current.some((f) => f.id === fieldId)) return
      fieldsRef.current = [...fieldsRef.current, { id: fieldId, label }]
      setVersion((v) => v + 1)
    },
    []
  )

  const unregister = useCallback((fieldId: ProfileEditFieldId) => {
    delete callbacksRef.current[fieldId]
    fieldsRef.current = fieldsRef.current.filter((f) => f.id !== fieldId)
    setVersion((v) => v + 1)
  }, [])

  const enterEditMode = useCallback((fieldId: ProfileEditFieldId) => {
    callbacksRef.current[fieldId]?.()
  }, [])

  const getMenuItems = useCallback((): ContextMenuItemType[] => {
    const fields = fieldsRef.current
    const byId = Object.fromEntries(fields.map((f) => [f.id, f]))
    const items: ContextMenuItemType[] = PROFILE_EDIT_FIELD_IDS.filter(
      (id): id is ProfileEditFieldId => Boolean(byId[id])
    ).map((id) => {
      const entry = byId[id]!
      return {
        label: entry.label,
        onClick: () => enterEditMode(id),
      }
    })
    return items.length > 0 ? [...items, { type: 'separator' as const }] : []
  }, [enterEditMode])

  const value = useMemo<ProfileEditContextValue>(
    () => ({
      register,
      unregister,
      enterEditMode,
      getMenuItems,
      version,
    }),
    [register, unregister, enterEditMode, getMenuItems, version]
  )

  return (
    <ProfileEditContext.Provider value={value}>
      {children}
    </ProfileEditContext.Provider>
  )
}

export function useProfileEdit() {
  const ctx = useContext(ProfileEditContext)
  if (!ctx) return null
  return ctx
}
