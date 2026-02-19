'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@ws/ui/components/ui/avatar';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ws/ui/components/animate-ui/primitives/radix/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@ws/ui/components/animate-ui/components/radix/dropdown-menu'
import { IconLogout, IconUser, IconUserShield } from '@tabler/icons-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@ws/ui/components/animate-ui/components/radix/sidebar';
import { useEffect, useMemo, useState } from 'react';

import { Kbd } from '@ws/ui/components/ui/kbd';
import Link from 'next/link';
import { Separator } from '@ws/ui/components/ui/separator';
import { SignOutButton } from '@clerk/nextjs'
import { cn } from '@ws/ui/lib/utils';
import { useIsMobile } from '@ws/ui/hooks/use-mobile';
import { usePathname } from 'next/navigation'
import { useSidebarStore } from '@/stores/sidebar-store';
import { trackEvent } from "@/lib/analytics/events/client";
import { useUserContext } from '@/components/providers/user/user-provider';
import { useUserStore } from '@/stores/user-store';
import { menuItems, type MenuItem } from './menu-items';

export type { MenuItem };

export function AppSidebar() {
  const { user: { user } } = useUserContext();
  const { user: userStore } = useUserStore();
  const { variant, collapsible } = useSidebarStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const pathname = usePathname()
  const { state, setOpenMobile } = useSidebar()
  const isMobile = useIsMobile()

  useEffect(() => {
    useSidebarStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  const menuItemsFiltered = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.isAdmin && userStore?.role !== 'admin') {
        return false
      }
      return true
    })
  }, [userStore?.role])

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu onOpenChange={setDialogOpen}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                >
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
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg z-150"
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
                  {userStore?.role === 'admin' && (
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

      <Separator />

      <SidebarContent className={cn(state === 'expanded' && 'p-2')}>
        <SidebarMenu>
          {menuItemsFiltered.map((item) => {
            const isSubItemActive = item.subItems?.some(subItem => pathname === subItem.href);
            return (
              <div key={item.label ?? item.href}>
                {item.subItems ? (
                  <Collapsible defaultOpen={isMobile ? true : item.open ?? false} className="group/collapsible">
                    <SidebarMenuItem className={cn(
                      state === 'collapsed' && 'cursor-pointer transition-colors duration-300',
                      isMobile && 'py-1'
                    )}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={cn(
                          state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300',
                          isMobile && state === 'expanded' && 'py-3 min-h-[44px]'
                        )} isActive={state === 'expanded' && isSubItemActive}>
                          <item.icon className={cn(
                            'size-6 mx-2 transition-colors duration-300',
                            isMobile && 'size-7'
                          )} />
                          <span className={cn(
                            'transition-colors duration-300',
                            isMobile && 'text-base'
                          )}>{item.label}</span>
                          <ChevronRight className={cn(
                            "ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90",
                            isMobile && 'size-5'
                          )} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.label ?? subItem.href} className={cn(
                              state === 'collapsed' && 'cursor-pointer transition-colors duration-300'
                            )}>
                              <SidebarMenuSubButton className={cn(
                                state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300',
                                isMobile && state === 'expanded' && 'py-3 min-h-[44px]'
                              )}
                                isActive={state === 'expanded' && pathname === subItem.href}
                                asChild
                              >
                                <Link href={subItem.href || '#'}>
                                  <subItem.icon className={cn(
                                    'size-6 mx-2 transition-colors duration-300',
                                    isMobile && 'size-7'
                                  )} />
                                  <span className={cn(isMobile && 'text-base')}>{subItem.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem className={cn(state === 'collapsed' && 'cursor-pointer transition-colors duration-300', state === 'collapsed' && pathname === item.href ? 'bg-sidebar-accent text-primary' : '', state === 'collapsed' && pathname !== item.href ? 'text-muted-foreground' : '')}>
                    <SidebarMenuButton className={cn(
                      state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300',
                      isMobile && state === 'expanded' && 'py-3 min-h-[44px]'
                    )}
                      isActive={state === 'expanded' && pathname === item.href}
                      asChild
                    >
                      <Link href={item.href || '#'}>
                        <item.icon className={cn('size-6 mx-2', isMobile && 'size-7')} />
                        <span className={cn(isMobile && 'text-base')}>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </div>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail className='h-[98%] my-auto' />
    </Sidebar>
  )
}