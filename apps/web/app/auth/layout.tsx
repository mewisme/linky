'use client'

import { redirect, usePathname } from "next/navigation";

import { AuthLayout as Layout } from "@/components/layouts/auth-layout";
import { createClient } from '@/lib/supabase/client'
import { useEffect } from "react";

const authRoutes = ['/auth/sign-in', '/auth/sign-up', '/auth/forgot-password', '/auth/confirm']

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('user', user)
        if (authRoutes.includes(pathname)) {
          redirect('/')
        }
      }
    }
    getUser();
  }, [supabase.auth, pathname])

  return (
    <Layout>
      {children}
    </Layout>
  )
}