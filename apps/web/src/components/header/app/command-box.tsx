'use client'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/ui/command'
import { IconHome, IconLogout, IconPalette } from '@tabler/icons-react'
import { useCallback, useMemo } from 'react'

import { menuItems } from '@/components/sidebar/app-sidebar'
import { transformMenuItems } from '@/utils/transform'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useUserContext } from '@/components/providers/user/user-provider'

export interface CommandAction {
  label: string
  icon: React.ElementType
  description?: string
  category: string
  href?: string
  onSelect?: () => void
}

export function CommandBox({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()
  const { auth: { signOut } } = useUserContext()
  const allActions = useMemo(() => {
    const fromMenu = transformMenuItems(menuItems)
    const customActions: CommandAction[] = [
      {
        label: 'Home',
        icon: IconHome,
        category: 'Navigation',
        href: '/',
      },
      {
        label: 'Theme Toggle',
        icon: IconPalette,
        category: 'System',
        onSelect: () => {
          setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
        },
        description: `Toggle theme to ${resolvedTheme === 'dark' ? 'light' : 'dark'}`
      },
      {
        label: 'Logout',
        icon: IconLogout,
        category: 'Account',
        onSelect: () => {
          signOut()
        },
        description: 'Logout of your account'
      }
    ]
    return [...fromMenu, ...customActions]
  }, [resolvedTheme, setTheme, signOut])

  const onRunCommand = useCallback((action: CommandAction) => {
    setOpen(false)

    if (action.onSelect) {
      action.onSelect()
    } else if (action.href) {
      router.push(action.href)
    }
  }, [router, setOpen])

  const groups = allActions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = []
    acc[action.category]!.push(action)
    return acc
  }, {} as Record<string, CommandAction[]>)

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search for a page or command..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groups).map(([category, items]) => (
          <CommandGroup key={category} heading={category}>
            {items.map((item) => (
              <CommandItem
                key={item.label + item.href}
                onSelect={() => onRunCommand(item)}
                value={item.label}
                className="flex items-center gap-3 py-3"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}