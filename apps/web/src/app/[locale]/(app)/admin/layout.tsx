"use client";

import { Loading } from "@/shared/ui/common/loading";
import { isAdmin } from "@/shared/utils/roles";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useUserContext } from "@/providers/user/user-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const {
    auth: { isSignedIn, isLoaded: clerkLoaded },
    store: { user: userStore },
  } = useUserContext();

  useEffect(() => {
    if (!clerkLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.push("/");
      return;
    }

    if (userStore && !isAdmin(userStore.role)) {
      router.push("/");
      return;
    }
  }, [userStore, isSignedIn, clerkLoaded, router]);

  if (!clerkLoaded || !userStore || !isAdmin(userStore.role)) {
    return (
      <Loading
        variant="full"
      />
    );
  }

  return children;
}
