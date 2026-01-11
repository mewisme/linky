'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { ChevronDown, ChevronRight, HomeIcon, LogOutIcon, ShieldIcon } from 'lucide-react';
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

import { ActivityIcon } from '@repo/ui/components/animate-ui/icons/activity';
import { AnimateIcon } from '@repo/ui/components/animate-ui/icons/icon';
import { AudioLines } from '@repo/ui/components/animate-ui/icons/audio-lines'
import { CogIcon } from '@repo/ui/components/animate-ui/icons/cog'
import { Kbd } from '@repo/ui/components/ui/kbd';
import { Separator } from '@repo/ui/components/ui/separator';
import { UserIcon } from '@repo/ui/components/animate-ui/icons/user'
import { UsersIcon } from '@repo/ui/components/animate-ui/icons/users'
import { cn } from '@repo/ui/lib/utils';
import { useIsMobile } from '@repo/ui/hooks/use-mobile';
import { useUser } from '@clerk/nextjs';
import { useUserStore } from '@/stores/user-store';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  isAdmin?: boolean;
  open?: boolean;
  subItems?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Home',
    icon: HomeIcon,
    href: '/',
  },
  {
    label: 'Video Chat',
    icon: AudioLines,
    href: '/chat',
  },
  {
    label: 'User',
    icon: UserIcon,
    subItems: [
      {
        label: 'Profile',
        icon: UserIcon,
        href: '/user/profile',
      },
    ],
  },
  {
    label: 'Admin Panel',
    icon: ShieldIcon,
    href: '/admin',
    isAdmin: true,
    subItems: [
      {
        label: 'Users',
        icon: UsersIcon,
        href: '/admin/users',
      },
      {
        label: 'Visitors',
        icon: ActivityIcon,
        href: '/admin/visitors',
      },
    ],
  },
  {
    label: 'Settings',
    icon: CogIcon,
    href: '/settings',
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
    <Sidebar collapsible='icon' variant='floating' >
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
                      <UserIcon className='size-4 shrink-0' />
                    </div>
                    <span>Manage Account</span>
                  </DropdownMenuItem>
                  {userStore?.role === 'admin' && (
                    <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => router.push('/admin')}>
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        <ShieldIcon className='size-4 shrink-0' />
                      </div>
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <SignOutButton>
                  <DropdownMenuItem variant="destructive" className='cursor-pointer gap-2 p-2'>
                    <div className="flex size-6 items-center justify-center rounded-sm border">
                      <LogOutIcon className='size-4 shrink-0 dark:text-red-400 text-red-500' />
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
              <AnimateIcon animateOnHover key={item.href ?? item.label}>
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
                            <AnimateIcon animateOnHover key={subItem.href ?? subItem.label}>
                              <SidebarMenuSubItem className={cn(state === 'collapsed' && 'cursor-pointer transition-colors duration-300', state === 'collapsed' && pathname === subItem.href ? 'bg-sidebar-accent text-primary' : '', state === 'collapsed' && pathname !== subItem.href ? 'text-muted-foreground' : '')}>
                                <SidebarMenuSubButton className={cn(state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300', state === 'expanded' && pathname === subItem.href ? 'bg-sidebar-accent text-primary' : 'text-muted-foreground')} onClick={() => {
                                  if (subItem.href) {
                                    router.push(subItem.href)
                                  }
                                }}>
                                  <subItem.icon className='size-6 mx-2' />
                                  <span>{subItem.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            </AnimateIcon>
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
              </AnimateIcon>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail className='h-[98%] my-auto' />
    </Sidebar>
  )
}