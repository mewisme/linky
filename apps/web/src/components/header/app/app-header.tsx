'use client'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@repo/ui/components/ui/input-group"
import { Kbd, KbdGroup } from "@repo/ui/components/ui/kbd"
import { useEffect, useState } from 'react'

import { Button } from "@repo/ui/components/ui/button"
import { CommandBox } from './command-box'
import Link from "next/link"
import { Logo } from "../landing/logo"
import { ModeToggle } from "../mode-toggle"
import { NotificationsBell } from "../notifications-bell"
import { Search } from 'lucide-react'
import { SidebarTrigger } from '@repo/ui/components/animate-ui/components/radix/sidebar'
import { useIsMobile } from "@repo/ui/hooks/use-mobile"

export function AppHeader() {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

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
          <InputGroup>
            <InputGroupInput className='cursor-pointer ring-0 ' placeholder="Search..." readOnly onClick={() => setOpen(true)} />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className='flex items-center space-x-4'>
          <NotificationsBell />
          <ModeToggle />
        </div>
      </div>
      <CommandBox open={open} setOpen={setOpen} />
    </header >
  )
}