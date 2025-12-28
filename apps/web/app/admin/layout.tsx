"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useUserStore();
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();

  useEffect(() => {
    // Wait for both Clerk and user data to load
    if (!clerkLoaded || isLoading) {
      return;
    }

    // If user is not signed in, redirect to home
    if (!isSignedIn) {
      router.push("/");
      return;
    }

    // If user data is loaded and user is not admin, redirect to home
    if (user && user.role !== "admin") {
      router.push("/");
      return;
    }
  }, [user, isLoading, isSignedIn, clerkLoaded, router]);

  // Show loading state while checking
  if (!clerkLoaded || isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not admin, don't render children (redirect will happen)
  if (user.role !== "admin") {
    return null;
  }

  // User is admin, render children
  return <>{children}</>;
}

