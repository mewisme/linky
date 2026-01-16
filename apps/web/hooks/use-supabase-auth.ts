"use client";

import type { Session } from "@supabase/supabase-js";
import { useSupabase } from "@/components/providers/supabase";

export function useSupabaseAuth() {
  const { supabase, session, loading } = useSupabase();

  return {
    supabase,
    session,
    loading,
    isAuthenticated: !!session,
  };
}
