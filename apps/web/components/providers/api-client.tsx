"use client";

/**
 * API Client Provider
 * Initializes the API client with Clerk authentication
 * Must be used inside ClerkProvider
 */

import { useAuthClient } from "@/hooks/use-auth-client";

export function ApiClientProvider({ children }: { children: React.ReactNode }) {
  // Initialize API client with automatic token management
  useAuthClient();

  return <>{children}</>;
}

