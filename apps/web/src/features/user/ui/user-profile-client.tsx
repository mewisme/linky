'use client'

import { Card, CardContent } from '@ws/ui/components/ui/card'
import {
  IconEdit,
} from '@tabler/icons-react'

import { AppLayout } from '@/shared/ui/layouts/app-layout'
import { BioSection } from "./bio-section";
import { InterestTagsSection } from "./interest-tags-section";
import { PersonalInfoSection } from "./personal-info-section";
import { ProfileAvatar } from "./profile-avatar";
import { ProfileNameFields } from "./profile-name-fields";
import type { UsersAPI } from '@/entities/user/types/users.types'
import { useUserContext } from '@/providers/user/user-provider'
import { useMemo, useState } from 'react'
import { Button } from '@ws/ui/components/ui/button'
import { useTranslations } from 'next-intl'

interface ProfilePageContentProps {
  initialUserDetails: UsersAPI.UserDetails.GetMe.Response | null
}

function ProfilePageContent({ initialUserDetails }: ProfilePageContentProps) {
  const tp = useTranslations('user.profile')
  const {
    user: { user },
    store: { user: userStore, userDetails: storeUserDetails },
    state: { updateUserCountry, updateUserDetails },
  } = useUserContext()
  const [headerEditSignal, setHeaderEditSignal] = useState(0)
  const [isHeaderEditing, setIsHeaderEditing] = useState(false)

  const userDetails = useMemo(() => {
    return storeUserDetails ?? initialUserDetails ?? null
  }, [storeUserDetails, initialUserDetails])

  return (
    <Card className="overflow-hidden border-0 bg-card shadow-sm ring-1 ring-border/50 sm:rounded-2xl">
      <CardContent className="p-0">
        <div className="flex flex-col">
          <section
            aria-label={tp('profileIdentityAria')}
            className="group/profile-header relative flex flex-col items-center gap-6 border-b border-border/50 bg-muted/20 px-4 py-8 sm:flex-row sm:items-start sm:gap-8 sm:px-6 sm:py-10"
          >
            <ProfileAvatar user={user!} />
            <ProfileNameFields
              user={user!}
              userStore={userStore}
              updateUserCountry={updateUserCountry}
              startEditingSignal={headerEditSignal}
              onEditingChange={setIsHeaderEditing}
            />
            {!isHeaderEditing && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="absolute right-4 top-4 gap-1 text-muted-foreground sm:right-6 sm:top-6 sm:opacity-0 sm:transition-opacity sm:group-hover/profile-header:opacity-100"
                onClick={() => setHeaderEditSignal((current) => current + 1)}
              >
                <IconEdit className="size-4" />
                {tp('edit')}
              </Button>
            )}
          </section>

          <section
            aria-label={tp('additionalInfoAria')}
            className="flex flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8"
          >
            <h2 className="sr-only">{tp('additionalInfoHeading')}</h2>

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

interface Props {
  initialUserDetails: UsersAPI.UserDetails.GetMe.Response | null
}

export function UserProfileClient({ initialUserDetails }: Props) {
  const {
    user: { isLoaded, user },
  } = useUserContext()

  if (!isLoaded || !user) return null

  return (
    <AppLayout sidebarItem="profile" className="space-y-4">
      <ProfilePageContent initialUserDetails={initialUserDetails} />
    </AppLayout>
  )
}
