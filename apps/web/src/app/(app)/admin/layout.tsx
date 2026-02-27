"use client";

import { Loading } from "@/components/common/loading";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/components/providers/user/user-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { auth: { isSignedIn, isLoaded: clerkLoaded }, store: { user: userStore } } = useUserContext();

  useEffect(() => {
    if (!clerkLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.push("/");
      return;
    }

    if (userStore && userStore.role !== "admin" && userStore.role !== "superadmin") {
      router.push("/");
      return;
    }
  }, [userStore, isSignedIn, clerkLoaded, router]);

  if (!clerkLoaded || !userStore) {
    return (
      <Loading height={'full'} width={'full'} size="lg" title="Loading admin resources..." />
    );
  }

  if (userStore.role !== "admin" && userStore.role !== "superadmin") {
    return null;
  }

  return children;
}
