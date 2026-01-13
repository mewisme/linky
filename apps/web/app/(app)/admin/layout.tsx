"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = new QueryClient();
  const router = useRouter();
  const { user, isLoading } = useUserStore();
  const { isSignedIn, isLoaded: clerkLoaded } = useAuth();

  useEffect(() => {
    if (!clerkLoaded || isLoading) {
      return;
    }

    if (!isSignedIn) {
      router.push("/");
      return;
    }

    if (user && user.role !== "admin") {
      router.push("/");
      return;
    }
  }, [user, isLoading, isSignedIn, clerkLoaded, router]);

  if (!clerkLoaded || isLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return null;
  }

  return children;
}

