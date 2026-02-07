'use client'

import { Button } from "@repo/ui/components/ui/button"
import { CommandMenu } from '@/components/header/command-menu'
import Link from "next/link"
import { Logo } from "../landing/logo"
import { ModeToggle } from "../mode-toggle"
import { NotificationsBell } from "../notifications-bell"
import { SidebarTrigger } from '@repo/ui/components/animate-ui/components/radix/sidebar'
import { useIsMobile } from "@repo/ui/hooks/use-mobile"

export function AppHeader() {
  const isMobile = useIsMobile()

  return (
    <header className="w-full h-16 bg-background container mx-auto relative">
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