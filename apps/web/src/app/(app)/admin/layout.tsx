"use client";

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

    if (userStore && userStore.role !== "admin") {
      router.push("/");
      return;
    }
  }, [userStore, isSignedIn, clerkLoaded, router]);

  if (!clerkLoaded || !userStore) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userStore.role !== "admin") {
    return null;
  }

  return children;
}
