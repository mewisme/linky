import { AppClientLayout } from "./components/layouts/app-client-layout";
import { IdentifyComponent } from '@openpanel/nextjs';
import { currentUser } from "@clerk/nextjs/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <>
      <IdentifyComponent
        profileId={user?.id}
        email={user?.emailAddresses[0]?.emailAddress}
        firstName={user?.firstName}
        lastName={user?.lastName}
        avatarUrl={user?.imageUrl}
      />
      <AppClientLayout>
        {children}
      </AppClientLayout>
    </>
  )
}