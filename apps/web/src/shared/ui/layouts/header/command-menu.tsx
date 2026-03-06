'use client'

import * as Sentry from "@sentry/nextjs";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@ws/ui/components/ui/command'
import { CornerDownLeftIcon, Search } from '@ws/ui/internal-lib/icons'
import {
  IconBan,
  IconBell,
  IconBolt,
  IconBug,
  IconChartLine,
  IconContract,
  IconFlag,
  IconGift,
  IconHeart,
  IconHistory,
  IconHome,
  IconId,
  IconLayoutSidebar,
  IconLock,
  IconLogin,
  IconLogout,
  IconPalette,
  IconSettings,
  IconSettingsCog,
  IconShield,
  IconSpeakerphone,
  IconTags,
  IconUserPlus,
  IconUserShield,
  IconUsers,
  IconVersions,
  IconVideo
} from '@tabler/icons-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@ws/ui/components/ui/input-group'
import { Kbd, KbdGroup } from '@ws/ui/components/ui/kbd'
import { isAdmin, isSuperAdmin } from '@/shared/utils/roles'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Logo } from '@/shared/ui/layouts/header/landing/logo'
import { Separator } from '@ws/ui/components/ui/separator'
import { trackEvent } from '@/lib/telemetry/events/client'
import { useCommandMenuStore } from '@/shared/model/command-menu-store'
import { useRouter } from 'next/navigation'
import { useSidebarStore } from '@/shared/model/sidebar-store'
import { useTheme } from 'next-themes'
import { useUserContext } from '@/providers/user/user-provider'
import { useUserStore } from '@/entities/user/model/user-store'

interface CommandAction {
  id: string
  label: string
  icon: React.ElementType
  iconImage?: string
  href?: string
  onSelect?: () => Promise<void>
  keywords?: string[]
}

interface CommandGroup {
  heading: string
  actions: CommandAction[]
  showForAdmin?: boolean
}

function CommandMenuFooter() {
  return (
    <>
      <div className="flex h-10" />

      <div className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-between gap-2 rounded-b-2xl border-t bg-zinc-100/30 px-4 text-xs font-medium dark:bg-zinc-800/30">
        <Logo className="size-10 text-muted-foreground" aria-hidden draw />

        <div className="flex shrink-0 items-center gap-2">
          <span>Enter to open</span>
          <Kbd>
            <CornerDownLeftIcon />
          </Kbd>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4"
          />
          <span className="text-muted-foreground">Exit</span>
          <Kbd>Esc</Kbd>
        </div>
      </div>
    </>
  )
}

export function CommandMenu() {
  const { isOpen, open, setOpen } = useCommandMenuStore()
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { auth: { signOut, isSignedIn } } = useUserContext()
  const { user: userStore } = useUserStore()
  const { setCollapsible, setVariant, variant, collapsible } = useSidebarStore()
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    const feedbackIntegration = Sentry.getFeedback();
    if (feedbackIntegration) {
      setFeedback(feedbackIntegration);
    }
  }, []);

  const isAdminUser = isAdmin(userStore?.role)
  const isSuperAdminUser = isSuperAdmin(userStore?.role)

  const commandGroups = useMemo<CommandGroup[]>(() => [
    {
      heading: 'Quick Actions',
      actions: [
        ...(isSignedIn ? [
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
        ] : [
          {
            id: 'sign-in',
            label: 'Sign In',
            icon: IconLogin,
            href: '/sign-in',
            keywords: ['signin', 'signup'],
          },
          {
            id: 'sign-up',
            label: 'Sign Up',
            icon: IconUserPlus,
            href: '/sign-up',
            keywords: ['signup', 'signin'],
          },
        ])
      ],
    },
    ...[
      {
        heading: 'Help & Support',
        actions: [
          {
            id: 'feedback',
            label: 'Report an Issue',
            icon: IconBug,
            onSelect: async () => {
              const form = await feedback?.createForm();
              form.appendToDom();
              form.open();
            },
            keywords: ['feedback', 'report', 'issue'],
          },
        ],
      },
    ],
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
        ...(isSignedIn ? [
          {
            id: 'blocked-users',
            label: 'Blocked Users',
            icon: IconBan,
            href: '/settings/blocked-users',
            keywords: ['block', 'ban'],
          },
        ] : []),
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
          onSelect: async () => {
            setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
          },
          keywords: ['theme', 'dark', 'light', 'mode'],
        },
        {
          id: 'sidebar-variant',
          label: 'Sidebar Style',
          icon: IconVersions,
          onSelect: async () => {
            setVariant(variant === 'sidebar' ? 'floating' : 'sidebar')
          },
          keywords: ['sidebar', 'style', 'variant', 'floating'],
        },
        {
          id: 'sidebar-collapsible',
          label: 'Sidebar Behavior',
          icon: IconLayoutSidebar,
          onSelect: async () => {
            setCollapsible(collapsible === 'offcanvas' ? 'icon' : 'offcanvas')
          },
          keywords: ['sidebar', 'collapsible', 'behavior'],
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
        ...(isSignedIn ? [
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
        ] : []),
      ],
    },
    ...(isAdminUser ? [
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
          ...(isSuperAdminUser ? [
            {
              id: 'admin-config',
              label: 'Config',
              icon: IconSettingsCog,
              href: '/admin/config',
              keywords: ['config', 'settings'],
            },
          ] : []),
          {
            id: 'admin-users',
            label: 'Manage Users',
            icon: IconUsers,
            href: '/admin/users',
            keywords: ['users', 'accounts'],
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
      }
    ] : []),
    ...(isSignedIn ? [
      {
        heading: 'Account',
        actions: [
          {
            id: 'logout',
            label: 'Logout',
            icon: IconLogout,
            onSelect: async () => {
              trackEvent({ name: "sign_out" });
              signOut();
            },
            keywords: ['signout', 'exit', 'leave'],
          },
        ],
      },
    ] : []),
  ], [collapsible, feedback, isAdminUser, isSignedIn, isSuperAdminUser, resolvedTheme, setCollapsible, setTheme, setVariant, signOut, variant])

  const filteredGroups = useMemo(() => {
    return commandGroups
      .filter(group => {
        if (group.showForAdmin && !isAdminUser) {
          return false
        }
        return true
      })
      .filter(group => group.actions.length > 0)
  }, [commandGroups, isAdminUser])

  const onRunCommand = useCallback(async (action: CommandAction) => {
    setOpen(false)

    if (action.onSelect) {
      await action.onSelect()
    } else if (action.href) {
      router.push(action.href)
    }
    trackEvent({ name: "command_executed", properties: { command: action.id } })
  }, [router, setOpen])

  return (
    <>
      <InputGroup onClick={open}>
        <InputGroupInput className='cursor-pointer ring-0' placeholder="Search..." readOnly />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end" >
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </InputGroupAddon>
      </InputGroup>
      <CommandDialog
        open={isOpen}
        onOpenChange={(open) => {
          setOpen(open);
          if (open) trackEvent({ name: "command_palette_opened" });
        }}
      >
        <Command>
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
          <CommandMenuFooter />
        </Command>
      </CommandDialog>
    </>
  )
}
