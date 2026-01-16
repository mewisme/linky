"use client";

import type { User } from "@supabase/supabase-js";
import { useSupabase } from "@/components/providers/supabase";

export function useSupabaseUser() {
  const { supabase, user, loading } = useSupabase();

  return {
    supabase,
    user,
    loading,
    isAuthenticated: !!user,
  };
}
