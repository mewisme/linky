'use client'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@repo/ui/components/ui/command'
import {
  IconBan,
  IconBell,
  IconBolt,
  IconChartLine,
  IconContract,
  IconCornerDownLeft,
  IconEyeCog,
  IconFlag,
  IconGift,
  IconHeart,
  IconHistory,
  IconHome,
  IconId,
  IconLayoutSidebar,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLock,
  IconLogout,
  IconPalette,
  IconSettings,
  IconShield,
  IconSpeakerphone,
  IconTags,
  IconUserShield,
  IconUsers,
  IconVersions,
  IconVideo,
} from '@tabler/icons-react'
import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@repo/ui/components/animate-ui/components/radix/sidebar'
import { useSidebarStore } from '@/stores/sidebar-store'
import { useTheme } from 'next-themes'
import { useUserContext } from '@/components/providers/user/user-provider'
import { useUserStore } from '@/stores/user-store'
import { cn } from '@repo/ui/lib/utils'

interface CommandAction {
  id: string
  label: string
  icon: React.ElementType
  href?: string
  onSelect?: () => void
  keywords?: string[]
}

interface CommandGroup {
  heading: string
  actions: CommandAction[]
  showForAdmin?: boolean
}

function CommandFooter() {
  return (
    <div className="flex items-center gap-2 border-t px-4 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <IconCornerDownLeft className="h-3 w-3" />
        <span>to select</span>
      </div>
      <div className="flex items-center gap-1">
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          Esc
        </kbd>
        <span>to close</span>
      </div>
    </div>
  )
}

export function CommandBox({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { auth: { signOut } } = useUserContext()
  const { user: userStore } = useUserStore()
  const { setCollapsible, setVariant, variant, collapsible } = useSidebarStore()
  const { toggleSidebar, state: sidebarState } = useSidebar()

  const isAdmin = userStore?.role === 'admin'

  const commandGroups = useMemo<CommandGroup[]>(() => [
    {
      heading: 'Quick Actions',
      actions: [
        {
          id: 'start-chat',
          label: 'Start Video Chat',
          icon: IconVideo,
          href: '/chat',
          keywords: ['video', 'call', 'match', 'random'],
        },
        {
          id: 'call-history',
          label: 'Call History',
          icon: IconHistory,
          href: '/chat/call-history',
          keywords: ['history', 'calls', 'past'],
        },
        {
          id: 'favorites',
          label: 'Favorites',
          icon: IconHeart,
          href: '/connections/favorites',
          keywords: ['favorites', 'connections', 'saved'],
        },
      ],
    },
    {
      heading: 'Navigation',
      actions: [
        {
          id: 'home',
          label: 'Home',
          icon: IconHome,
          href: '/',
        },
        {
          id: 'profile',
          label: 'Profile',
          icon: IconId,
          href: '/user/profile',
          keywords: ['account', 'user'],
        },
        {
          id: 'security',
          label: 'Security',
          icon: IconShield,
          href: '/user/security',
          keywords: ['password', 'auth', 'safety'],
        },
        {
          id: 'progress',
          label: 'Progress',
          icon: IconChartLine,
          href: '/user/progress',
          keywords: ['level', 'streak', 'stats', 'xp'],
        },
        {
          id: 'user-reports',
          label: 'My Reports',
          icon: IconFlag,
          href: '/user/reports',
          keywords: ['reports', 'flags'],
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: IconSettings,
          href: '/settings',
        },
      ],
    },
    {
      heading: 'Admin',
      showForAdmin: true,
      actions: [
        {
          id: 'admin-dashboard',
          label: 'Admin Dashboard',
          icon: IconUserShield,
          href: '/admin',
          keywords: ['admin', 'dashboard', 'panel'],
        },
        {
          id: 'admin-users',
          label: 'Manage Users',
          icon: IconUsers,
          href: '/admin/users',
          keywords: ['users', 'accounts'],
        },
        {
          id: 'admin-visitors',
          label: 'Manage Visitors',
          icon: IconEyeCog,
          href: '/admin/visitors',
          keywords: ['visitors', 'analytics'],
        },
        {
          id: 'admin-tags',
          label: 'Interest Tags',
          icon: IconTags,
          href: '/admin/interest-tags',
          keywords: ['tags', 'interests'],
        },
        {
          id: 'admin-changelogs',
          label: 'Change Logs',
          icon: IconContract,
          href: '/admin/changelogs',
          keywords: ['changelog', 'updates', 'releases'],
        },
        {
          id: 'admin-reports',
          label: 'Manage Reports',
          icon: IconFlag,
          href: '/admin/reports',
          keywords: ['reports', 'flags', 'moderation'],
        },
        {
          id: 'admin-rewards',
          label: 'Level Rewards',
          icon: IconGift,
          href: '/admin/level-rewards',
          keywords: ['rewards', 'levels'],
        },
        {
          id: 'admin-features',
          label: 'Feature Unlocks',
          icon: IconLock,
          href: '/admin/level-feature-unlocks',
          keywords: ['features', 'unlocks', 'levels'],
        },
        {
          id: 'admin-bonuses',
          label: 'Streak Bonuses',
          icon: IconBolt,
          href: '/admin/streak-exp-bonuses',
          keywords: ['streak', 'bonus', 'xp', 'multiplier'],
        },
        {
          id: 'admin-broadcasts',
          label: 'Broadcasts',
          icon: IconSpeakerphone,
          href: '/admin/broadcasts',
          keywords: ['broadcast', 'announcements', 'notifications'],
        },
      ],
    },
    {
      heading: 'Preferences',
      actions: [
        {
          id: 'appearance',
          label: 'Appearance',
          icon: IconPalette,
          href: '/settings/appearance',
          keywords: ['theme', 'colors', 'dark', 'light'],
        },
        {
          id: 'blocked-users',
          label: 'Blocked Users',
          icon: IconBan,
          href: '/settings/blocked-users',
          keywords: ['block', 'ban'],
        },
        {
          id: 'notifications',
          label: 'Notifications',
          icon: IconBell,
          href: '/settings/notifications',
          keywords: ['push', 'alerts'],
        },
        {
          id: 'toggle-theme',
          label: `${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`,
          icon: IconPalette,
          onSelect: () => {
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
          },
          keywords: ['theme', 'dark', 'light', 'mode'],
        },
        {
          id: 'toggle-sidebar',
          label: `${sidebarState === 'expanded' ? 'Collapse' : 'Expand'} Sidebar`,
          icon: sidebarState === 'expanded' ? IconLayoutSidebarLeftCollapse : IconLayoutSidebarLeftExpand,
          onSelect: () => {
            toggleSidebar()
          },
          keywords: ['sidebar', 'menu', 'navigation'],
        },
        {
          id: 'sidebar-variant',
          label: 'Sidebar Style',
          icon: IconVersions,
          onSelect: () => {
            setVariant(variant === 'sidebar' ? 'floating' : 'sidebar')
          },
          keywords: ['sidebar', 'style', 'variant', 'floating'],
        },
        {
          id: 'sidebar-collapsible',
          label: 'Sidebar Behavior',
          icon: IconLayoutSidebar,
          onSelect: () => {
            setCollapsible(collapsible === 'offcanvas' ? 'icon' : 'offcanvas')
          },
          keywords: ['sidebar', 'collapsible', 'behavior'],
        },
      ],
    },
    {
      heading: 'Account',
      actions: [
        {
          id: 'logout',
          label: 'Logout',
          icon: IconLogout,
          onSelect: () => {
            signOut()
          },
          keywords: ['signout', 'exit', 'leave'],
        },
      ],
    },
  ], [collapsible, resolvedTheme, setCollapsible, setTheme, setVariant, sidebarState, signOut, toggleSidebar, variant])

  const filteredGroups = useMemo(() => {
    return commandGroups
      .filter(group => {
        if (group.showForAdmin && !isAdmin) {
          return false
        }
        return true
      })
      .filter(group => group.actions.length > 0)
  }, [commandGroups, isAdmin])

  const onRunCommand = useCallback((action: CommandAction) => {
    setOpen(false)

    if (action.onSelect) {
      action.onSelect()
    } else if (action.href) {
      router.push(action.href)
    }
  }, [router, setOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search commands and pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {filteredGroups.map((group, groupIndex) => (
          <div key={group.heading}>
            <CommandGroup heading={group.heading}>
              {group.actions.map((action) => (
                <CommandItem
                  key={action.id}
                  onSelect={() => onRunCommand(action)}
                  value={`${action.label} ${action.keywords?.join(' ') || ''}`}
                  keywords={action.keywords}
                  className="flex items-center gap-2"
                >
                  <action.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{action.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {groupIndex < filteredGroups.length - 1 && <CommandSeparator className="my-1" />}
          </div>
        ))}
      </CommandList>
      <CommandFooter />
    </CommandDialog>
  )
}
