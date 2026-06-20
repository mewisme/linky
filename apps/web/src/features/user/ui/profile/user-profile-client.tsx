"use client";

import { CardContent } from "@ws/ui/components/ui/card";

import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { BioSection } from "./bio-section";
import { InterestTagsSection } from "./interest-tags-section";
import { PersonalInfoSection } from "./personal-info-section";
import { ProfileHeaderSection } from "./profile-header-section";
import type { UsersAPI } from "@/entities/user/types/users.types";
import { useUserContext } from "@/providers/user/user-provider";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

interface ProfilePageContentProps {
  initialUserDetails: UsersAPI.UserDetails.GetMe.Response | null;
}

function ProfilePageContent({ initialUserDetails }: ProfilePageContentProps) {
  const tp = useTranslations("user.profile");
  const {
    user: { user },
    store: { user: userStore, userDetails: storeUserDetails },
    state: { updateUserCountry, updateUserDetails },
  } = useUserContext();
  const userDetails = useMemo(() => {
    return storeUserDetails ?? initialUserDetails ?? null;
  }, [storeUserDetails, initialUserDetails]);

  return (
    <CardContent className="p-0">
      <div className="flex flex-col">
        <ProfileHeaderSection
          user={user!}
          userStore={userStore}
          updateUserCountry={updateUserCountry}
        />

        <section
          aria-label={tp("additionalInfoAria")}
          className="flex flex-col gap-4 px-4 py-6 sm:gap-5 sm:px-6 sm:py-8"
        >
          <h2 className="sr-only">{tp("additionalInfoHeading")}</h2>

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
  );
}

interface Props {
  initialUserDetails: UsersAPI.UserDetails.GetMe.Response | null;
}

export function UserProfileClient({ initialUserDetails }: Props) {
  const {
    user: { isLoaded, user },
  } = useUserContext();

  if (!isLoaded || !user) return null;

  return (
    <AppLayout sidebarItem="profile" className="space-y-4">
      <ProfilePageContent initialUserDetails={initialUserDetails} />
    </AppLayout>
  );
}
