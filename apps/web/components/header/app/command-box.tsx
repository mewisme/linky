'use client'

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from '@repo/ui/components/ui/command'

interface CommandBoxProps {
  open: boolean
  setOpen: (open: boolean) => void
}

export function CommandBox({ open, setOpen }: CommandBoxProps) {
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search..." />
    </CommandDialog>
  )
}