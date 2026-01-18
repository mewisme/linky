'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@repo/ui/components/animate-ui/primitives/radix/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@repo/ui/components/animate-ui/components/radix/dropdown-menu'
import {
  IconActivity,
  IconContract,
  IconEyeCog,
  IconFlag,
  IconHeartHandshake,
  IconHome,
  IconLogout,
  IconSettings,
  IconTags,
  IconUser,
  IconUserScan,
  IconUserShield,
  IconUsers,
  IconView360
} from '@tabler/icons-react'
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
} from '@repo/ui/components/animate-ui/components/radix/sidebar';
import { SignOutButton, useAuth } from '@clerk/nextjs'
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation'

import { Kbd } from '@repo/ui/components/ui/kbd';
import { Separator } from '@repo/ui/components/ui/separator';
import { cn } from '@repo/ui/lib/utils';
import { useIsMobile } from '@repo/ui/hooks/use-mobile';
import { useUser } from '@clerk/nextjs';
import { useUserStore } from '@/stores/user-store';

export interface MenuItem {
  label: string;
  icon: React.ElementType;
  description?: string;
  category?: string;
  href?: string;
  isAdmin?: boolean;
  open?: boolean;
  subItems?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  {
    label: 'Home',
    icon: IconHome,
    description: 'Go to the home page',
    href: '/',
    category: 'Navigation',
  },
  {
    label: 'Video Chat',
    icon: IconView360,
    description: 'Start a video chat',
    href: '/chat',
    category: 'Navigation',
  },
  {
    label: 'Call History',
    icon: IconActivity,
    description: 'View your call history',
    href: '/call-history',
    category: 'Navigation',
  },
  {
    label: 'User',
    icon: IconUser,
    subItems: [
      {
        label: 'Profile',
        icon: IconUserScan,
        description: 'View your profile',
        href: '/user/profile',
        category: 'Account',
      },
      {
        label: 'Favorites',
        icon: IconHeartHandshake,
        description: 'View your favorites',
        href: '/user/favorites',
        category: 'Account',
      },
      {
        label: 'Reports',
        icon: IconFlag,
        description: 'View your reports',
        href: '/user/reports',
        category: 'Account',
      },
    ],
  },
  {
    label: 'Admin Panel',
    icon: IconUserShield,
    description: 'View the admin dashboard',
    href: '/admin',
    isAdmin: true,
    subItems: [
      {
        label: 'Users',
        icon: IconUsers,
        description: 'View the users list',
        href: '/admin/users',
        category: 'Admin',
      },
      {
        label: 'Visitors',
        icon: IconEyeCog,
        description: 'View the visitors list',
        href: '/admin/visitors',
        category: 'Admin',
      },
      {
        label: 'Interest Tags',
        icon: IconTags,
        description: 'View the interest tags list',
        href: '/admin/interest-tags',
        category: 'Admin',
      },
      {
        label: 'Change Logs',
        icon: IconContract,
        description: 'Manage the change logs',
        href: '/admin/changelogs',
        category: 'Admin',
      },
      {
        label: 'Reports',
        icon: IconFlag,
        description: 'Manage reports',
        href: '/admin/reports',
        category: 'Admin',
      }
    ],
  },
  {
    label: 'Settings',
    icon: IconSettings,
    description: 'View the settings',
    href: '/settings',
    category: 'Settings',
  },
]

export function AppSidebar() {
  const { user } = useUser()
  const { signOut } = useAuth();
  const { user: userStore } = useUserStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSidebar()
  const isMobile = useIsMobile()

  const menuItemsFiltered = useMemo(() => {
    return menuItems.filter((item) => {
      if (item.isAdmin && userStore?.role !== 'admin') {
        return false
      }
      return true
    })
  }, [userStore?.role])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "q" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        console.log("Signing out")
        e.preventDefault()
        signOut()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [signOut])

  return (
    <Sidebar collapsible='icon' variant='floating' className='z-120!' >
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
                      <AvatarImage src={user?.imageUrl} />
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
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side={isMobile ? 'bottom' : 'right'}
                sideOffset={4}
              >
                <DropdownMenuLabel className='text-xs text-muted-foreground'>My Account</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => router.push('/user/profile')}>
                    <div className="flex size-6 items-center justify-center rounded-sm border">
                      <IconUser className='size-4 shrink-0' />
                    </div>
                    <span>Manage Account</span>
                  </DropdownMenuItem>
                  {userStore?.role === 'admin' && (
                    <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => router.push('/admin')}>
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <IconUserShield className='size-4 shrink-0' />
                      </div>
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <SignOutButton>
                  <DropdownMenuItem variant="destructive" className='cursor-pointer gap-2 p-2'>
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
                  <Collapsible defaultOpen={item.open ?? false} className="group/collapsible">
                    <SidebarMenuItem className={cn(state === 'collapsed' && 'cursor-pointer transition-colors duration-300', state === 'collapsed' && isSubItemActive ? 'bg-sidebar-accent text-primary' : '')}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={cn(state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300', state === 'expanded' && isSubItemActive ? 'bg-sidebar-accent text-primary' : '')}>
                          <item.icon className={cn('size-6 mx-2 transition-colors duration-300', isSubItemActive ? 'text-primary' : 'text-muted-foreground')} />
                          <span className={cn('transition-colors duration-300', isSubItemActive ? 'text-primary' : 'text-muted-foreground')}>{item.label}</span>
                          <ChevronRight className={cn("ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90", isSubItemActive ? 'text-primary' : 'text-muted-foreground')} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.label ?? subItem.href} className={cn(state === 'collapsed' && 'cursor-pointer transition-colors duration-300', state === 'collapsed' && pathname === subItem.href ? 'bg-sidebar-accent text-primary' : '', state === 'collapsed' && pathname !== subItem.href ? 'text-muted-foreground' : '')}>
                              <SidebarMenuSubButton className={cn(state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300', state === 'expanded' && pathname === subItem.href ? 'bg-sidebar-accent text-primary' : 'text-muted-foreground')} onClick={() => {
                                if (subItem.href) {
                                  router.push(subItem.href)
                                }
                              }}>
                                <subItem.icon className={cn('size-6 mx-2 transition-colors duration-300', pathname === subItem.href ? 'text-primary' : 'text-muted-foreground!')} />
                                <span>{subItem.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem className={cn(state === 'collapsed' && 'cursor-pointer transition-colors duration-300', state === 'collapsed' && pathname === item.href ? 'bg-sidebar-accent text-primary' : '', state === 'collapsed' && pathname !== item.href ? 'text-muted-foreground' : '')}>
                    <SidebarMenuButton className={cn(state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300', state === 'expanded' && pathname === item.href ? 'bg-sidebar-accent text-primary' : 'text-muted-foreground')} onClick={() => {
                      if (item.href) {
                        router.push(item.href)
                      }
                    }}>
                      <item.icon className='size-6 mx-2' />
                      <span>{item.label}</span>
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