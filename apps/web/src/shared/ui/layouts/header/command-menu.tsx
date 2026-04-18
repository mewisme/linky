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
  IconFlag,
  IconGift,
  IconHeart,
  IconHistory,
  IconHome,
  IconLanguage,
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
import { useRouter as useNextRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'

import { Logo } from '@/shared/ui/layouts/header/landing/logo'
import { Separator } from '@ws/ui/components/ui/separator'
import { trackEvent } from '@/lib/telemetry/events/client'
import { useCommandMenuStore } from '@/shared/model/command-menu-store'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useLocalePreferenceStore } from '@/shared/model/locale-preference-store'
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

interface CommandGroupDef {
  id: string
  heading: string
  actions: CommandAction[]
  showForAdmin?: boolean
}

function CommandMenuFooter() {
  const t = useTranslations()
  return (
    <>
      <div className="flex h-10" />

      <div className="absolute inset-x-0 bottom-0 flex h-10 items-center justify-between gap-2 rounded-b-2xl border-t bg-zinc-100/30 px-4 text-xs font-medium dark:bg-zinc-800/30">
        <Logo className="size-10 text-muted-foreground" aria-hidden draw />

        <div className="flex shrink-0 items-center gap-2">
          <span>{t('commandMenu.ui.enterToOpen')}</span>
          <Kbd>
            <CornerDownLeftIcon />
          </Kbd>
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-4"
          />
          <span className="text-muted-foreground">{t('commandMenu.ui.exit')}</span>
          <Kbd>Esc</Kbd>
        </div>
      </div>
    </>
  )
}

function parseKeywords(tRoot: ReturnType<typeof useTranslations>, key: string): string[] {
  return (tRoot as (k: string) => string)(`commandMenu.keywords.${key}`).split(/\s+/).filter(Boolean)
}

export function CommandMenu() {
  const { isOpen, open, setOpen } = useCommandMenuStore()
  const router = useRouter()
  const pathname = usePathname()
  const nextRouter = useNextRouter()
  const setPersistedLocale = useLocalePreferenceStore((s) => s.setLocale)
  const { setTheme, resolvedTheme } = useTheme()
  const { auth: { signOut, isSignedIn } } = useUserContext()
  const { user: userStore } = useUserStore()
  const { setCollapsible, setVariant, variant, collapsible } = useSidebarStore()
  const [feedback, setFeedback] = useState<unknown>(null);
  const locale = useLocale()
  const t = useTranslations()

  useEffect(() => {
    const feedbackIntegration = Sentry.getFeedback();
    if (feedbackIntegration) {
      setFeedback(feedbackIntegration);
    }
  }, []);

  const isAdminUser = isAdmin(userStore?.role)
  const isSuperAdminUser = isSuperAdmin(userStore?.role)

  const switchLocale = useCallback(
    (next: 'en' | 'vi') => {
      if (next === locale) return
      setPersistedLocale(next)
      router.replace(pathname, { locale: next })
      nextRouter.refresh()
    },
    [locale, pathname, router, nextRouter, setPersistedLocale],
  )

  const commandGroups = useMemo<CommandGroupDef[]>(() => {
    return [
      {
        id: 'quickActions',
        heading: t('commandMenu.groups.quickActions'),
        actions: [
          ...(isSignedIn ? [
            {
              id: 'start-chat',
              label: t('sidebar.items.videoChat.label'),
              icon: IconVideo,
              href: '/call',
              keywords: parseKeywords(t, 'startChat'),
            },
            {
              id: 'call-history',
              label: t('sidebar.items.callHistory.label'),
              icon: IconHistory,
              href: '/call/history',
              keywords: parseKeywords(t, 'callHistory'),
            },
            {
              id: 'favorites',
              label: t('sidebar.items.favorites.label'),
              icon: IconHeart,
              href: '/connections/favorites',
              keywords: parseKeywords(t, 'favorites'),
            },
          ] : [
            {
              id: 'sign-in',
              label: t('commandMenu.commands.signIn'),
              icon: IconLogin,
              href: '/sign-in',
              keywords: parseKeywords(t, 'signIn'),
            },
            {
              id: 'sign-up',
              label: t('commandMenu.commands.signUp'),
              icon: IconUserPlus,
              href: '/sign-up',
              keywords: parseKeywords(t, 'signUp'),
            },
          ]),
          ...(locale === 'vi'
            ? [
              {
                id: 'locale-en',
                label: t('commandMenu.commands.localeEnglish'),
                icon: IconLanguage,
                onSelect: async () => {
                  switchLocale('en')
                },
                keywords: parseKeywords(t, 'localeEnglish'),
              },
            ]
            : []),
          ...(locale === 'en'
            ? [
              {
                id: 'locale-vi',
                label: t('commandMenu.commands.localeVietnamese'),
                icon: IconLanguage,
                onSelect: async () => {
                  switchLocale('vi')
                },
                keywords: parseKeywords(t, 'localeVietnamese'),
              },
            ]
            : []),
        ],
      },
      {
        id: 'helpSupport',
        heading: t('commandMenu.groups.helpSupport'),
        actions: [
          {
            id: 'feedback',
            label: t('commandMenu.commands.feedback'),
            icon: IconBug,
            onSelect: async () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const form = await (feedback as any)?.createForm?.()
              if (!form) return
              form.appendToDom()
              form.open()
            },
            keywords: parseKeywords(t, 'feedback'),
          },
        ],
      },
      {
        id: 'preferences',
        heading: t('commandMenu.groups.preferences'),
        actions: [
          {
            id: 'appearance',
            label: t('sidebar.items.settingsAppearance.label'),
            icon: IconPalette,
            href: '/settings/appearance',
            keywords: parseKeywords(t, 'appearance'),
          },
          ...(isSignedIn ? [
            {
              id: 'blocked-users',
              label: t('sidebar.items.blockedUsers.label'),
              icon: IconBan,
              href: '/settings/blocked-users',
              keywords: parseKeywords(t, 'blockedUsers'),
            },
          ] : []),
          {
            id: 'notifications',
            label: t('sidebar.items.settingsNotifications.label'),
            icon: IconBell,
            href: '/settings/notifications',
            keywords: parseKeywords(t, 'notifications'),
          },
          {
            id: 'toggle-theme',
            label: resolvedTheme === 'dark'
              ? t('commandMenu.commands.toggleThemeLight')
              : t('commandMenu.commands.toggleThemeDark'),
            icon: IconPalette,
            onSelect: async () => {
              setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
            },
            keywords: parseKeywords(t, 'toggleTheme'),
          },
          {
            id: 'sidebar-variant',
            label: t('commandMenu.commands.sidebarStyle'),
            icon: IconVersions,
            onSelect: async () => {
              setVariant(variant === 'sidebar' ? 'floating' : 'sidebar')
            },
            keywords: parseKeywords(t, 'sidebarVariant'),
          },
          {
            id: 'sidebar-collapsible',
            label: t('commandMenu.commands.sidebarBehavior'),
            icon: IconLayoutSidebar,
            onSelect: async () => {
              setCollapsible(collapsible === 'offcanvas' ? 'icon' : 'offcanvas')
            },
            keywords: parseKeywords(t, 'sidebarCollapsible'),
          },
        ],
      },
      {
        id: 'navigation',
        heading: t('commandMenu.groups.navigation'),
        actions: [
          {
            id: 'home',
            label: t('navigation.home'),
            icon: IconHome,
            href: '/',
            keywords: parseKeywords(t, 'home'),
          },
          ...(isSignedIn ? [
            {
              id: 'profile',
              label: t('sidebar.items.profile.label'),
              icon: IconId,
              href: '/user/profile',
              keywords: parseKeywords(t, 'profile'),
            },
            {
              id: 'security',
              label: t('sidebar.items.security.label'),
              icon: IconShield,
              href: '/user/security',
              keywords: parseKeywords(t, 'security'),
            },
            {
              id: 'progress',
              label: t('sidebar.items.progress.label'),
              icon: IconChartLine,
              href: '/user/progress',
              keywords: parseKeywords(t, 'progress'),
            },
            {
              id: 'user-reports',
              label: t('commandMenu.commands.myReports'),
              icon: IconFlag,
              href: '/user/reports',
              keywords: parseKeywords(t, 'userReports'),
            },
            {
              id: 'settings',
              label: t('sidebar.items.settings.label'),
              icon: IconSettings,
              href: '/settings',
              keywords: parseKeywords(t, 'settings'),
            },
          ] : []),
        ],
      },
      ...(isAdminUser ? [
        {
          id: 'admin',
          heading: t('commandMenu.groups.admin'),
          showForAdmin: true,
          actions: [
            {
              id: 'admin-dashboard',
              label: t('sidebar.items.adminPanel.label'),
              icon: IconUserShield,
              href: '/admin',
              keywords: parseKeywords(t, 'adminDashboard'),
            },
            ...(isSuperAdminUser ? [
              {
                id: 'admin-config',
                label: t('sidebar.items.adminConfig.label'),
                icon: IconSettingsCog,
                href: '/admin/config',
                keywords: parseKeywords(t, 'adminConfig'),
              },
            ] : []),
            {
              id: 'admin-users',
              label: t('commandMenu.commands.manageUsers'),
              icon: IconUsers,
              href: '/admin/users',
              keywords: parseKeywords(t, 'adminUsers'),
            },
            {
              id: 'admin-tags',
              label: t('sidebar.items.adminInterestTags.label'),
              icon: IconTags,
              href: '/admin/interest-tags',
              keywords: parseKeywords(t, 'adminTags'),
            },
            {
              id: 'admin-reports',
              label: t('commandMenu.commands.manageReports'),
              icon: IconFlag,
              href: '/admin/reports',
              keywords: parseKeywords(t, 'adminReports'),
            },
            {
              id: 'admin-rewards',
              label: t('sidebar.items.adminLevelRewards.label'),
              icon: IconGift,
              href: '/admin/level-rewards',
              keywords: parseKeywords(t, 'adminRewards'),
            },
            {
              id: 'admin-features',
              label: t('sidebar.items.adminFeatureUnlocks.label'),
              icon: IconLock,
              href: '/admin/level-feature-unlocks',
              keywords: parseKeywords(t, 'adminFeatures'),
            },
            {
              id: 'admin-bonuses',
              label: t('sidebar.items.adminStreakExp.label'),
              icon: IconBolt,
              href: '/admin/streak-exp-bonuses',
              keywords: parseKeywords(t, 'adminBonuses'),
            },
            {
              id: 'admin-broadcasts',
              label: t('sidebar.items.adminBroadcasts.label'),
              icon: IconSpeakerphone,
              href: '/admin/broadcasts',
              keywords: parseKeywords(t, 'adminBroadcasts'),
            },
          ],
        }
      ] : []),
      ...(isSignedIn ? [
        {
          id: 'account',
          heading: t('commandMenu.groups.account'),
          actions: [
            {
              id: 'logout',
              label: t('commandMenu.commands.logout'),
              icon: IconLogout,
              onSelect: async () => {
                trackEvent({ name: "sign_out" });
                signOut();
              },
              keywords: parseKeywords(t, 'logout'),
            },
          ],
        },
      ] : []),
    ]
  }, [collapsible, feedback, isAdminUser, isSignedIn, isSuperAdminUser, locale, resolvedTheme, setCollapsible, setTheme, setVariant, signOut, switchLocale, t, variant])

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
        <InputGroupInput className='cursor-pointer ring-0' placeholder={t('commandMenu.ui.searchPlaceholder')} readOnly />
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
          <CommandInput placeholder={t('commandMenu.ui.commandInputPlaceholder')} />
          <CommandList>
            <CommandEmpty>{t('commandMenu.ui.noResults')}</CommandEmpty>
            {filteredGroups.map((group, groupIndex) => (
              <div key={group.id}>
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
