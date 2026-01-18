'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import {
  IconBrandApple,
  IconBrandFacebook,
  IconBrandGoogle,
  IconCircleCheckFilled,
  IconCircleXFilled,
} from '@tabler/icons-react'

import { AppLayout } from '@/components/layouts/app-layout'
import { Badge } from '@repo/ui/components/ui/badge'
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

          <Separator />

          {/* EQUAL HEIGHT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* EMAILS */}
            <div className="h-full flex flex-col space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Email Addresses
              </h3>

              <div className="grid gap-3 flex-1">
                {user.emailAddresses.map((email) => (
                  <div
                    key={email.id}
                    className="flex items-center justify-between p-4 border rounded-xl bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {email.emailAddress}
                      </span>
                      {email.id === user.primaryEmailAddressId && (
                        <Badge variant="secondary">Primary</Badge>
                      )}
                      {email.verification.status === 'verified' ? (
                        <IconCircleCheckFilled className="size-4 text-green-500" />
                      ) : (
                        <IconCircleXFilled className="size-4 text-destructive" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CONNECTED ACCOUNTS */}
            <div className="h-full flex flex-col space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Connected Accounts
              </h3>

              <div className="grid gap-3 flex-1">
                {user.externalAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-xl bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-full">
                        {account.provider === 'google' && (
                          <IconBrandGoogle className="size-5" />
                        )}
                        {account.provider === 'facebook' && (
                          <IconBrandFacebook className="size-5 text-[#1877F2]" />
                        )}
                        {account.provider === 'apple' && (
                          <IconBrandApple className="size-5" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-semibold capitalize">
                          {account.provider}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {account.emailAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {user.externalAccounts.length === 0 && (
                  <div className="h-full flex items-center justify-center border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                    No social accounts connected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}
