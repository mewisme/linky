'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@ws/ui/components/ui/avatar';
import { ChevronDown, ChevronRight } from '@ws/ui/internal-lib/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ws/ui/components/animate-ui/components/radix/dropdown-menu';
import { IconDeviceDesktop, IconLogout, IconMoon, IconPalette, IconSun, IconUser, IconUserShield } from '@tabler/icons-react';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ws/ui/components/animate-ui/components/radix/sidebar';

import { Kbd } from '@ws/ui/components/ui/kbd';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { cn } from '@ws/ui/lib/utils';
import { isAdmin } from '@/shared/utils/roles';
import { trackEvent } from '@/lib/telemetry/events/client';
import { useIsMobile } from '@ws/ui/hooks/use-mobile';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useUserContext } from '@/providers/user/user-provider';
import { useUserStore } from '@/entities/user/model/user-store';

export function AppSidebarHeader() {
  const { user: { user } } = useUserContext();
  const { user: userStore } = useUserStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const { setTheme } = useTheme();

  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu onOpenChange={setDialogOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Avatar className="rounded-lg size-8">
                    <AvatarImage src={user?.imageUrl} alt={`${user?.firstName} ${user?.lastName}`} />
                    <AvatarFallback>
                      {user?.firstName?.charAt(0) ||
                        user?.lastName?.charAt(0) ||
                        '?'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {user?.firstName} {user?.lastName}
                  </span>
                </div>
                <ChevronDown className={cn('ml-auto transition-transform duration-200', dialogOpen && 'rotate-180')} />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn("w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg overflow-hidden", isMobile && "z-150")}
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className='text-xs text-muted-foreground'>My Account</DropdownMenuLabel>
              <DropdownMenuGroup>
                <Link href='/user/profile'>
                  <DropdownMenuItem className='cursor-pointer gap-2 p-2'>
                    <div className="flex size-6 items-center justify-center rounded-sm border">
                      <IconUser className='size-4 shrink-0' />
                    </div>
                    <span>Manage Account</span>
                  </DropdownMenuItem>
                </Link>
                {isAdmin(userStore?.role) && (
                  <Link href='/admin'>
                    <DropdownMenuItem className='cursor-pointer gap-2 p-2'>
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <IconUserShield className='size-4 shrink-0' />
                      </div>
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  </Link>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className='text-xs text-muted-foreground'>Appearance</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className='cursor-pointer gap-2 p-2'>
                    <div className="flex size-6 items-center justify-center rounded-sm border ">
                      <IconPalette className='size-4 shrink-0 text-muted-foreground' />
                    </div>
                    <span>Theme</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className={cn("w-[--radix-dropdown-menu-trigger-width] rounded-lg", isMobile && "z-150")}>
                    <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => setTheme("light")} data-track='set_theme_light'>
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <IconSun className='size-4 shrink-0' />
                      </div>
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => setTheme("dark")} data-track='set_theme_dark'>
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <IconMoon className='size-4 shrink-0' />
                      </div>
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => setTheme("system")} data-track='set_theme_system'>
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <IconDeviceDesktop className='size-4 shrink-0' />
                      </div>
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <SignOutButton>
                <DropdownMenuItem
                  variant="destructive"
                  className='cursor-pointer gap-2 p-2'
                  onClick={() => trackEvent({ name: "sign_out" })}
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <IconLogout className='size-4 shrink-0 dark:text-red-400 text-red-500' />
                  </div>
                  <span className='dark:text-red-400'>Logout</span>
                  <DropdownMenuShortcut>
                    <Kbd>⇧⌘Q</Kbd>
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              </SignOutButton>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
