'use client'

import { Button } from "@ws/ui/components/ui/button"
import { CommandMenu } from '@/shared/ui/layouts/header/command-menu'
import Link from "next/link"
import { Logo } from "../landing/logo"
import { NotificationsBell } from "../notifications-bell"
import { SidebarTrigger } from '@ws/ui/components/animate-ui/components/radix/sidebar'
import { cn } from "@ws/ui/lib/utils"
import { useIsMobile } from "@ws/ui/hooks/use-mobile"

export function AppHeader() {
  const isMobile = useIsMobile()

  return (
    <header
      className={cn(
        "sticky top-0 z-20 h-16 w-full bg-background container mx-auto"
      )}
    >
      <div className="grid grid-cols-3 items-center h-full mx-4">

        <div className="flex items-center space-x-4">
          <Button asChild variant="outline" size="icon">
            <SidebarTrigger />
          </Button>

          {!isMobile && (
            <Link href="/">
              <Logo size="sm" className="cursor-pointer" />
            </Link>
          )}
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <CommandMenu />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4">
          <NotificationsBell />
        </div>

      </div>
    </header>
  )
}