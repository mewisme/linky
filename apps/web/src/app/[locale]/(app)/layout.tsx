import { AppClientLayout } from "@/shared/ui/layouts/app-client-layout";
import { currentUser } from "@clerk/nextjs/server";
import { identifyUser } from "@/lib/telemetry/identify-server";
import { waitUntil } from '@vercel/functions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  waitUntil(identifyUser(user));
  return <AppClientLayout>{children}</AppClientLayout>;
}