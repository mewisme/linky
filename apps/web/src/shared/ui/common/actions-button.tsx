'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ws/ui/components/animate-ui/components/radix/alert-dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@ws/ui/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ws/ui/components/animate-ui/components/radix/dropdown-menu'
import { Fragment, useMemo, useState } from 'react'

import { Button } from '@ws/ui/components/ui/button'
import { IconDotsVertical } from '@tabler/icons-react'
import { cn } from '@ws/ui/lib/utils'
import { useIsMobile } from '@ws/ui/hooks/use-mobile'

export type ActionItem =
  | ActionItemSimple
  | ActionItemCheckbox
  | ActionItemRadioGroup
  | ActionItemSub
  | ActionItemLabel
  | ActionItemSeparator

export interface ConfirmActionConfig {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

export interface ActionItemSimple {
  type: 'item'
  label: string
  drawerItemLabel?: string
  dropdownItemLabel?: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
  testId?: string
  preventCloseOnClick?: boolean
  preventDrawerClose?: boolean
  confirmAction?: ConfirmActionConfig
}

export interface ActionItemCheckbox {
  type: 'checkbox'
  label: string
  drawerItemLabel?: string
  dropdownItemLabel?: string
  icon?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  testId?: string
}

export interface ActionItemRadioGroupOption {
  value: string
  label: string
  drawerItemLabel?: string
  dropdownItemLabel?: string
  icon?: React.ReactNode
  disabled?: boolean
}

export interface ActionItemRadioGroup {
  type: 'radio-group'
  label: string
  drawerItemLabel?: string
  dropdownItemLabel?: string
  icon?: React.ReactNode
  value: string
  onValueChange: (value: string) => void
  options: ActionItemRadioGroupOption[]
  disabled?: boolean
  testId?: string
}

export interface ActionItemSub {
  type: 'sub'
  label: string
  drawerItemLabel?: string
  dropdownItemLabel?: string
  icon?: React.ReactNode
  children: ActionItem[]
  disabled?: boolean
}

export interface ActionItemLabel {
  type: 'label'
  label: string
  dropdownItemLabel?: string
}

export interface ActionItemSeparator {
  type: 'separator'
}

type DrawerIntent = 'default' | 'destructive'

interface NormalizedDrawerItem {
  label: string
  drawerItemLabel?: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  intent: DrawerIntent
  testId?: string
  preventDrawerClose?: boolean
  confirmAction?: ConfirmActionConfig
}

function normalizeToDrawerItem(action: ActionItem): NormalizedDrawerItem[] {
  if (action.type === 'item') {
    return [
      {
        label: action.label,
        drawerItemLabel: action.drawerItemLabel,
        icon: action.icon,
        onClick: action.onClick,
        disabled: action.disabled,
        intent: (action.variant ?? 'default') === 'destructive' ? 'destructive' : 'default',
        testId: action.testId,
        preventDrawerClose: action.preventDrawerClose,
        confirmAction: action.confirmAction,
      },
    ]
  }
  if (action.type === 'checkbox') {
    return [
      {
        label: action.label,
        drawerItemLabel: action.drawerItemLabel,
        icon: action.icon,
        onClick: () => action.onCheckedChange(!action.checked),
        disabled: action.disabled,
        intent: 'default',
        testId: action.testId,
        preventDrawerClose: false,
      },
    ]
  }
  if (action.type === 'radio-group') {
    return action.options.map((opt) => ({
      label: opt.label,
      drawerItemLabel: opt.drawerItemLabel,
      icon: opt.icon,
      onClick: () => action.onValueChange(opt.value),
      disabled: action.disabled ?? opt.disabled,
      intent: 'default' as DrawerIntent,
      testId: action.testId ? `${action.testId}-${opt.value}` : undefined,
      preventDrawerClose: false as boolean | undefined,
    }))
  }
  if (action.type === 'sub') {
    return flattenDrawerItems(action.children)
  }
  if (action.type === 'label' || action.type === 'separator') {
    return []
  }
  return []
}

function flattenDrawerItems(items: ActionItem[]): NormalizedDrawerItem[] {
  return items.flatMap((item) => normalizeToDrawerItem(item))
}

interface ConfirmActionHandlers {
  onConfirmAction: (item: ActionItemSimple) => void
}

function renderDropdownItem(
  item: ActionItem,
  key: string | number,
  handlers?: ConfirmActionHandlers
) {
  switch (item.type) {
    case 'item':
      if (item.confirmAction && handlers) {
        return (
          <DropdownMenuItem
            key={key}
            onSelect={(e) => {
              e.preventDefault()
              handlers.onConfirmAction(item)
            }}
            disabled={item.disabled}
            variant={item.variant}
            data-testid={item.testId}
          >
            {item.icon}
            {item.dropdownItemLabel ?? item.label}
          </DropdownMenuItem>
        )
      }
      return (
        <DropdownMenuItem
          key={key}
          onClick={item.preventCloseOnClick ? undefined : item.onClick}
          onSelect={
            item.preventCloseOnClick
              ? (e) => {
                e.preventDefault()
                item.onClick()
              }
              : undefined
          }
          disabled={item.disabled}
          variant={item.variant}
          data-testid={item.testId}
        >
          {item.icon}
          {item.dropdownItemLabel ?? item.label}
        </DropdownMenuItem>
      )
    case 'checkbox':
      return (
        <DropdownMenuCheckboxItem
          key={key}
          checked={item.checked}
          onCheckedChange={item.onCheckedChange}
          disabled={item.disabled}
          data-testid={item.testId}
        >
          {item.icon}
          {item.dropdownItemLabel ?? item.label}
        </DropdownMenuCheckboxItem>
      )
    case 'radio-group':
      return (
        <DropdownMenuSub key={key}>
          <DropdownMenuSubTrigger disabled={item.disabled} className='flex items-center gap-2'>
            {item.icon}
            {item.dropdownItemLabel ?? item.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={item.value}
              onValueChange={item.onValueChange}
            >
              {item.options.map((opt) => (
                <DropdownMenuRadioItem
                  key={opt.value}
                  value={opt.value}
                  data-testid={item.testId ? `${item.testId}-${opt.value}` : undefined}
                  disabled={opt.disabled}
                >
                  {opt.icon}
                  {opt.dropdownItemLabel ?? opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )
    case 'sub':
      return (
        <DropdownMenuSub key={key}>
          <DropdownMenuSubTrigger disabled={item.disabled}>
            {item.icon}
            {item.dropdownItemLabel ?? item.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {item.children.map((child, i) =>
              renderDropdownItem(child, `${key}-${i}`, handlers)
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )
    case 'label':
      return <DropdownMenuLabel key={key}>{item.dropdownItemLabel ?? item.label}</DropdownMenuLabel>
    case 'separator':
      return <DropdownMenuSeparator key={key} />
    default:
      return null
  }
}

export interface ActionsButtonProps {
  actions: ActionItem[]
  trigger?: React.ReactNode
  title?: string
  className?: string
}

interface PendingConfirm {
  onClick: () => void
  confirmAction: ConfirmActionConfig
  preventCloseOnClick?: boolean
  preventDrawerClose?: boolean
}

export function ActionsButton({
  actions,
  trigger,
  title = 'Actions',
  className,
}: ActionsButtonProps) {
  const isMobile = useIsMobile()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null
  )

  const flatItems = useMemo(
    () => flattenDrawerItems(actions),
    [actions]
  )

  const confirmOpen = pendingConfirm !== null

  const handleConfirmAction = (item: ActionItemSimple) => {
    if (!item.confirmAction) return
    setPendingConfirm({
      onClick: item.onClick,
      confirmAction: item.confirmAction,
      preventCloseOnClick: item.preventCloseOnClick,
      preventDrawerClose: item.preventDrawerClose,
    })
    if (!item.preventCloseOnClick) setDropdownOpen(false)
    if (!item.preventDrawerClose) setDrawerOpen(false)
  }

  const handleConfirmDialogConfirm = () => {
    if (!pendingConfirm) return
    pendingConfirm.onClick()
    setPendingConfirm(null)
  }

  const handleConfirmDialogCancel = () => {
    setPendingConfirm(null)
  }

  const handleConfirmDrawerAction = (item: NormalizedDrawerItem) => {
    if (!item.confirmAction) return
    setPendingConfirm({
      onClick: item.onClick,
      confirmAction: item.confirmAction,
      preventCloseOnClick: false,
      preventDrawerClose: item.preventDrawerClose,
    })
    if (!item.preventDrawerClose) setDrawerOpen(false)
  }

  const confirmHandlers: ConfirmActionHandlers = {
    onConfirmAction: handleConfirmAction,
  }

  const defaultTrigger = (
    <Button
      variant="ghost"
      className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
      size="icon"
    >
      <span className="sr-only">Open menu</span>
      <IconDotsVertical />
    </Button>
  )

  const triggerButton = trigger ?? defaultTrigger

  if (isMobile) {
    return (
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && handleConfirmDialogCancel()}>
        <div className={cn('flex justify-center opacity-100', className)}>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>{title}</DrawerTitle>
              </DrawerHeader>
              <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-4 pb-8">
                {flatItems.map((item, i) => {
                  const handleClick = item.confirmAction
                    ? () => handleConfirmDrawerAction(item)
                    : item.onClick
                  const button = (
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-12 w-full justify-start gap-3',
                        item.intent === 'destructive' &&
                        'text-destructive hover:bg-destructive/10 hover:text-destructive'
                      )}
                      onClick={handleClick}
                      disabled={item.disabled}
                      data-testid={item.testId}
                    >
                      {item.icon}
                      {item.drawerItemLabel ?? item.label}
                    </Button>
                  )
                  return item.preventDrawerClose || item.confirmAction ? (
                    <Fragment key={i}>{button}</Fragment>
                  ) : (
                    <DrawerClose key={i} asChild>
                      {button}
                    </DrawerClose>
                  )
                })}
              </div>
            </DrawerContent>
          </Drawer>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{pendingConfirm?.confirmAction.title}</AlertDialogTitle>
              {pendingConfirm?.confirmAction.description && (
                <AlertDialogDescription>
                  {pendingConfirm.confirmAction.description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {pendingConfirm?.confirmAction.cancelLabel ?? 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDialogConfirm}
                className={
                  pendingConfirm?.confirmAction.variant === 'destructive'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:hover:bg-destructive/80'
                    : undefined
                }
              >
                {pendingConfirm?.confirmAction.confirmLabel ?? 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </div>
      </AlertDialog>
    )
  }

  return (
    <AlertDialog
      open={confirmOpen}
      onOpenChange={(open) => !open && handleConfirmDialogCancel()}
    >
      <div
        className={cn(
          'flex justify-center transition-opacity',
          'opacity-0 group-hover:opacity-100',
          className
        )}
      >
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="overflow-hidden">
            <DropdownMenuLabel>{title}</DropdownMenuLabel>
            {actions.map((item, i) =>
              renderDropdownItem(item, i, confirmHandlers)
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingConfirm?.confirmAction.title}
            </AlertDialogTitle>
            {pendingConfirm?.confirmAction.description && (
              <AlertDialogDescription>
                {pendingConfirm.confirmAction.description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {pendingConfirm?.confirmAction.cancelLabel ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDialogConfirm}
              className={
                pendingConfirm?.confirmAction.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:hover:bg-destructive/80 dark:text-white/80'
                  : undefined
              }
            >
              {pendingConfirm?.confirmAction.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </div>
    </AlertDialog>
  )
}
