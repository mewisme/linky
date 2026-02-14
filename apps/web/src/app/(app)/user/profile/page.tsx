'use client'

import { Card, CardContent } from '@ws/ui/components/ui/card'
import {
  IconCalendar,
  IconInfoCircle,
  IconTags,
  IconUser,
  IconWorld,
} from '@tabler/icons-react'

import { ActionsButton, type ActionItem } from '@/components/common/actions-button'
import { AppLayout } from '@/components/layouts/app-layout'
import { BioSection } from '../components/bio-section'
import type { ContextMenuItemSimple } from '@/components/context-menu/context-menu'
import { InterestTagsSection } from '../components/interest-tags-section'
import { PersonalInfoSection } from '../components/personal-info-section'
import { ProfileAvatar } from '../components/profile-avatar'
import { ProfileNameFields } from '../components/profile-name-fields'
import {
  FIELD_LABELS,
  ProfileEditProvider,
  PROFILE_EDIT_FIELD_IDS,
  useProfileEdit,
} from '@/components/context-menu/profile/profile-edit-context'
import { useUserContext } from '@/components/providers/user/user-provider'
import { useMemo } from 'react'

const PROFILE_EDIT_ICONS: Record<(typeof PROFILE_EDIT_FIELD_IDS)[number], React.ReactNode> = {
  name: <IconUser className="size-4" />,
  country: <IconWorld className="size-4" />,
  bio: <IconInfoCircle className="size-4" />,
  dateOfBirth: <IconCalendar className="size-4" />,
  gender: <IconUser className="size-4" />,
  interestTags: <IconTags className="size-4" />,
}

function ProfilePageContent() {
  const {
    user: { user },
    store: { user: userStore, userDetails },
    state: { updateUserCountry, updateUserDetails },
  } = useUserContext()
  const profileEdit = useProfileEdit()

  const actions = useMemo<ActionItem[]>(() => {
    if (!user || !profileEdit) return []
    const items = profileEdit
      .getMenuItems()
      .filter((item): item is ContextMenuItemSimple => item.type !== 'separator')
    const idByLabel = Object.fromEntries(
      (PROFILE_EDIT_FIELD_IDS as readonly string[]).map((id) => [
        FIELD_LABELS[id as keyof typeof FIELD_LABELS],
        id,
      ])
    ) as Record<string, keyof typeof PROFILE_EDIT_ICONS>
    return items.map((item) => {
      const fieldId = idByLabel[item.label]
      return {
        type: 'item' as const,
        label: item.label,
        onClick: item.onClick,
        icon: fieldId ? PROFILE_EDIT_ICONS[fieldId] : undefined,
      }
    })
  }, [user, profileEdit])

  return (
    <Card className="overflow-hidden border-0 bg-card shadow-sm ring-1 ring-border/50 sm:rounded-2xl">
      <CardContent className="p-0">
        <div className="flex flex-col">
          <section
            aria-label="Profile identity"
            className="flex flex-col items-center gap-6 border-b border-border/50 bg-muted/20 px-4 py-8 sm:flex-row sm:items-start sm:gap-8 sm:px-6 sm:py-10"
          >
            <ProfileAvatar user={user!} />
            <ProfileNameFields
              user={user!}
              userStore={userStore}
              updateUserCountry={updateUserCountry}
            />
            <ActionsButton
              actions={actions}
              title="Edit field"
              className="shrink-0 opacity-100"
            />
          </section>

          <section
            aria-label="Additional information"
            className="flex flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8"
          >
            <h2 className="sr-only">Additional information</h2>

            <BioSection
              userDetails={userDetails}
              updateUserDetails={updateUserDetails}
            />

            <PersonalInfoSection
              userDetails={userDetails}
              updateUserDetails={updateUserDetails}
            />

            <InterestTagsSection
              userDetails={userDetails}
              updateUserDetails={updateUserDetails}
            />
          </section>
        </div>
      </CardContent>
    </Card>
  )
}

export default function UserProfilePage() {
  const {
    user: { isLoaded, user },
  } = useUserContext()

  if (!isLoaded || !user) return null

  return (
    <AppLayout label="User Profile" description="Manage your account settings">
      <ProfileEditProvider>
        <ProfilePageContent />
      </ProfileEditProvider>
    </AppLayout>
  )
}
