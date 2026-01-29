'use client';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@repo/ui/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@repo/ui/components/ui/popover';

import type { AdminAPI } from '@/types/admin.types';
import { Button } from '@repo/ui/components/ui/button';
import { IconChevronDown } from '@tabler/icons-react';
import { cn } from '@repo/ui/lib/utils';
import { useState } from 'react';

function formatUserLabel(user: AdminAPI.User): string {
  const email = user.email ?? 'no-email';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
  return `${name} (${email})`;
}

function matchUser(query: string, user: AdminAPI.User): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const email = (user.email ?? '').toLowerCase();
  const firstName = (user.first_name ?? '').toLowerCase();
  const lastName = (user.last_name ?? '').toLowerCase();
  const id = user.id.toLowerCase();
  return (
    email.includes(q) ||
    firstName.includes(q) ||
    lastName.includes(q) ||
    id.includes(q)
  );
}

interface UserSearchSelectProps {
  users: AdminAPI.User[];
  value: AdminAPI.User | null;
  onChange: (user: AdminAPI.User | null) => void;
  excludeUserId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function UserSearchSelect({
  users,
  value,
  onChange,
  excludeUserId,
  placeholder = 'Select user',
  disabled,
  className,
}: UserSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = users.filter((u) => {
    if (excludeUserId && u.id === excludeUserId) return false;
    return matchUser(search, u);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          {value ? formatUserLabel(value) : placeholder}
          <IconChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by email or name..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onChange(user);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  {formatUserLabel(user)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
