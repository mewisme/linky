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
  IconBan,
  IconBell,
  IconBolt,
  IconChartLine,
  IconContract,
  IconFlag,
  IconGift,
  IconHeart,
  IconHistory,
  IconId,
  IconLock,
  IconLogout,
  IconMessages,
  IconPalette,
  IconSettings,
  IconShield,
  IconSpeakerphone,
  IconTags,
  IconUser,
  IconUserShield,
  IconUsers,
  IconVideo,
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
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation'

import { Kbd } from '@repo/ui/components/ui/kbd';
import { Separator } from '@repo/ui/components/ui/separator';
import { SignOutButton } from '@clerk/nextjs'
import { cn } from '@repo/ui/lib/utils';
import { useIsMobile } from '@repo/ui/hooks/use-mobile';
import { useSidebarStore } from '@/stores/sidebar-store';
import { useUserContext } from '@/components/providers/user/user-provider';
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
    label: 'Video Chat',
    icon: IconVideo,
    description: 'Start a video chat',
    href: '/chat',
    category: 'Navigation',
  },
  {
    label: 'Chat',
    icon: IconMessages,
    subItems: [
      {
        label: 'Call History',
        icon: IconHistory,
        description: 'View your call history',
        href: '/chat/call-history',
        category: 'Navigation',
      },
    ]
  },
  {
    label: 'Connections',
    icon: IconUsers,
    subItems: [
      {
        label: 'Favorites',
        icon: IconHeart,
        description: 'View your favorites',
        href: '/connections/favorites',
        category: 'Account',
      },
      {
        label: 'Blocked Users',
        icon: IconBan,
        description: 'Manage blocked users',
        href: '/connections/blocked-users',
        category: 'Connections',
      },
    ]
  },
  {
    label: 'User',
    icon: IconUser,
    subItems: [
      {
        label: 'Profile',
        icon: IconId,
        description: 'View your profile',
        href: '/user/profile',
        category: 'Account',
      },
      {
        label: 'Security',
        icon: IconShield,
        description: 'View your security settings',
        href: '/user/security',
        category: 'Account',
      },
      {
        label: 'Progress',
        icon: IconChartLine,
        description: 'View your level and streak progress',
        href: '/user/progress',
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
      },
      {
        label: 'Level Rewards',
        icon: IconGift,
        description: 'Manage level rewards',
        href: '/admin/level-rewards',
        category: 'Admin',
      },
      {
        label: 'Feature Unlocks',
        icon: IconLock,
        description: 'Manage level-based feature unlocks',
        href: '/admin/level-feature-unlocks',
        category: 'Admin',
      },
      {
        label: 'Streak EXP Bonuses',
        icon: IconBolt,
        description: 'Manage streak EXP bonus multipliers',
        href: '/admin/streak-exp-bonuses',
        category: 'Admin',
      },
      {
        label: 'Broadcasts',
        icon: IconSpeakerphone,
        description: 'Send announcements to all users',
        href: '/admin/broadcasts',
        category: 'Admin',
      },
    ],
  },
  {
    label: 'Settings',
    icon: IconSettings,
    description: 'View the settings',
    href: '/settings',
    category: 'Settings',
    subItems: [
      {
        label: 'Appearance',
        icon: IconPalette,
        description: 'Manage the appearance settings',
        href: '/settings/appearance',
        category: 'Settings',
      },
      {
        label: 'Notifications',
        icon: IconBell,
        description: 'Push notification settings',
        href: '/settings/notifications',
        category: 'Settings',
      },
    ],
  },
]

export function AppSidebar() {
  const { user: { user } } = useUserContext();
  const { user: userStore } = useUserStore();
  const { variant, collapsible } = useSidebarStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter()
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
                        <SidebarMenuButton className={cn(
                          state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300',
                          state === 'expanded' && isSubItemActive ? 'bg-sidebar-accent text-primary' : '',
                          isMobile && state === 'expanded' && 'py-3 min-h-[44px]'
                        )}>
                          <item.icon className={cn(
                            'size-6 mx-2 transition-colors duration-300',
                            isSubItemActive ? 'text-primary' : 'text-muted-foreground',
                            isMobile && 'size-7'
                          )} />
                          <span className={cn(
                            'transition-colors duration-300',
                            isSubItemActive ? 'text-primary' : 'text-muted-foreground',
                            isMobile && 'text-base'
                          )}>{item.label}</span>
                          <ChevronRight className={cn(
                            "ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90",
                            isSubItemActive ? 'text-primary' : 'text-muted-foreground',
                            isMobile && 'size-5'
                          )} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.label ?? subItem.href} className={cn(state === 'collapsed' && 'cursor-pointer transition-colors duration-300', state === 'collapsed' && pathname === subItem.href ? 'bg-sidebar-accent text-primary' : '', state === 'collapsed' && pathname !== subItem.href ? 'text-muted-foreground' : '')}>
                              <SidebarMenuSubButton className={cn(
                                state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300',
                                state === 'expanded' && pathname === subItem.href ? 'bg-sidebar-accent text-primary' : 'text-muted-foreground',
                                isMobile && state === 'expanded' && 'py-3 min-h-[44px]'
                              )} onClick={() => {
                                if (subItem.href) {
                                  router.push(subItem.href)
                                }
                              }}>
                                <subItem.icon className={cn(
                                  'size-6 mx-2 transition-colors duration-300',
                                  pathname === subItem.href ? 'text-primary' : 'text-muted-foreground!',
                                  isMobile && 'size-7'
                                )} />
                                <span className={cn(isMobile && 'text-base')}>{subItem.label}</span>
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
                      state === 'expanded' && pathname === item.href ? 'bg-sidebar-accent text-primary' : 'text-muted-foreground',
                      isMobile && state === 'expanded' && 'py-3 min-h-[44px]'
                    )} onClick={() => {
                      if (item.href) {
                        router.push(item.href)
                      }
                    }}>
                      <item.icon className={cn('size-6 mx-2', isMobile && 'size-7')} />
                      <span className={cn(isMobile && 'text-base')}>{item.label}</span>
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