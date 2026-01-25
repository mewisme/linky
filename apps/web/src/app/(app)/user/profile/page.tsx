'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'

import {
  AppLayout
} from '@/components/layouts/app-layout'
import { BioSection } from '../components/bio-section'
import { InterestTagsSection } from '../components/interest-tags-section'
import { PersonalInfoSection } from '../components/personal-info-section'
import { ProfileAvatar } from '../components/profile-avatar'
import { ProfileNameFields } from '../components/profile-name-fields'
import { Separator } from '@repo/ui/components/ui/separator'
import { useUserContext } from '@/components/providers/user/user-provider'

export default function UserProfilePage() {
  const {
    user: { isLoaded, user },
    store: { user: userStore, userDetails },
    state: { updateUserCountry, updateUserDetails },
  } = useUserContext()

  if (!isLoaded || !user) return null

  return (
    <AppLayout label="User Profile" description="Manage your account settings">
      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* PROFILE */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ProfileAvatar user={user} />
            <ProfileNameFields
              user={user}
              userStore={userStore}
              updateUserCountry={updateUserCountry}
            />
          </div>

          <Separator />

          {/* USER DETAILS SECTION */}
          <div className="space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Information
            </h3>

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
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
