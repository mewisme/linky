'use client'

import { Button } from "@ws/ui/components/ui/button"
import { CommandMenu } from '@/components/header/command-menu'
import Link from "next/link"
import { Logo } from "../landing/logo"
import { ModeToggle } from "../mode-toggle"
import { NotificationsBell } from "../notifications-bell"
import { SidebarTrigger } from '@ws/ui/components/animate-ui/components/radix/sidebar'
import { cn } from "@ws/ui/lib/utils"
import { useIsMobile } from "@ws/ui/hooks/use-mobile"

export function AppHeader() {
  const isMobile = useIsMobile()
  return (
    <header
      className={cn(
        "sticky top-0 z-20 w-full h-16 bg-background container mx-auto transition-[border-color]",
      )}
    >
      <div className='h-full flex items-center justify-between space-x-4 mx-4'>
        <div className='flex items-center space-x-4'>
          <Button asChild variant='outline' size='icon'>
            <SidebarTrigger />
          </Button>
          {!isMobile && (
            <Link href="/">
              <Logo
                size="sm"
                className="cursor-pointer"
              />
            </Link>
          )}
        </div>
        <div className='max-w-md w-full'>
          <CommandMenu />
        </div>
        <div className='flex items-center space-x-4'>
          <NotificationsBell />
          <ModeToggle />
        </div>
      </div>
    </header >
  )
}