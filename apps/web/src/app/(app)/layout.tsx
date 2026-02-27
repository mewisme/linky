import { AppClientLayout } from "./components/layouts/app-client-layout";
import { IdentifyComponent } from '@openpanel/nextjs';
import { currentUser } from "@clerk/nextjs/server";
import { identifyUser } from "@/lib/analytics/identify-server";
import { waitUntil } from '@vercel/functions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  waitUntil(identifyUser(user));
  return (
    <>
      <IdentifyComponent
        profileId={user?.id}
        email={user?.emailAddresses[0]?.emailAddress}
        firstName={user?.firstName ?? ''}
        lastName={user?.lastName ?? ''}
        avatar={user?.imageUrl}
      />
      <AppClientLayout>
        {children}
      </AppClientLayout>
    </>
  )
}