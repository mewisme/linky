'use client'

import {
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenu as ContextMenuPrimitive,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@ws/ui/components/ui/context-menu'

import { Fragment, Children, isValidElement } from 'react'

export type ContextMenuItemType =
  | ContextMenuItemSimple
  | ContextMenuItemSub
  | ContextMenuItemLabel
  | ContextMenuItemSeparator

export interface ContextMenuItemSimple {
  type?: 'item'
  label: string
  shortcut?: string | React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'destructive'
}

export interface ContextMenuItemSub {
  type: 'sub'
  label: string
  children: ContextMenuItemType[]
  disabled?: boolean
}

export interface ContextMenuItemLabel {
  type: 'label'
  label: string
}

export interface ContextMenuItemSeparator {
  type: 'separator'
}

function renderContextMenuItem(item: ContextMenuItemType, key: React.Key): React.ReactNode {
  if (item.type === 'separator') {
    return <ContextMenuSeparator key={key} />
  }
  if (item.type === 'label') {
    return <ContextMenuLabel key={key}>{item.label}</ContextMenuLabel>
  }
  if (item.type === 'sub') {
    return (
      <ContextMenuSub key={key}>
        <ContextMenuSubTrigger disabled={item.disabled}>
          {item.label}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {item.children.map((child, i) => (
            <Fragment key={i}>{renderContextMenuItem(child, `${String(key)}-${i}`)}</Fragment>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
    )
  }
  const simple = item as ContextMenuItemSimple
  return (
    <ContextMenuItem
      key={key}
      onClick={simple.onClick}
      disabled={simple.disabled}
      variant={simple.variant}
    >
      {simple.label}
      {simple.shortcut != null && (
        <ContextMenuShortcut>
          {typeof simple.shortcut === 'string' ? simple.shortcut : simple.shortcut}
        </ContextMenuShortcut>
      )}
    </ContextMenuItem>
  )
}

function splitIntoGroups(items: ContextMenuItemType[]): ContextMenuItemType[][] {
  const groups: ContextMenuItemType[][] = []
  let current: ContextMenuItemType[] = []
  for (const item of items) {
    if (item.type === 'separator') {
      if (current.length > 0) {
        groups.push(current)
        current = []
      }
    } else {
      current.push(item)
    }
  }
  if (current.length > 0) groups.push(current)
  return groups
}

export interface ContextMenuProps extends Omit<React.ComponentProps<typeof ContextMenuPrimitive>, 'children'> {
  children: React.ReactNode
  items: ContextMenuItemType[]
}

export function ContextMenu({ children, items, ...props }: ContextMenuProps) {
  const groups = splitIntoGroups(items)
  const triggerChild =
    Children.count(children) === 1 && isValidElement(children)
      ? children
      : <span className="contents">{children}</span>
  return (
    <ContextMenuPrimitive {...props}>
      <ContextMenuTrigger asChild>{triggerChild}</ContextMenuTrigger>
      <ContextMenuContent>
        {groups.map((group, groupIndex) => (
          <Fragment key={groupIndex}>
            {groupIndex > 0 && <ContextMenuSeparator />}
            <ContextMenuGroup>
              {group.map((item, i) => renderContextMenuItem(item, `${groupIndex}-${i}`))}
            </ContextMenuGroup>
          </Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenuPrimitive>
  )
}
