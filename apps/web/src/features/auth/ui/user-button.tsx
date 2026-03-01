"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ws/ui/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from "@ws/ui/components/animate-ui/components/radix/dropdown-menu";
import { LogOutIcon, ShieldIcon, UserIcon } from "@ws/ui/internal-lib/icons";

import { Kbd } from "@ws/ui/components/ui/kbd";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { isAdmin } from "@/shared/utils/roles";
import { trackEvent } from "@/lib/telemetry/events/client";
import { useEffect } from "react";
import { useUserContext } from "@/providers/user/user-provider";
import { useUserStore } from "@/entities/user/model/user-store";

export function UserButton() {
  const { user, auth: { signOut } } = useUserContext();
  const { user: userStore } = useUserStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "q" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        trackEvent({ name: "sign_out" });
        signOut();
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [signOut])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 cursor-pointer">
          <AvatarImage src={user.user?.imageUrl} alt={`${user.user?.firstName} ${user.user?.lastName}`} />
          <AvatarFallback>
            {user.user?.firstName?.charAt(0) ||
              user.user?.lastName?.charAt(0) ||
              '?'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <DropdownMenuLabel className='text-xs text-muted-foreground'>My Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <Link href='/user/profile'>
            <DropdownMenuItem className='cursor-pointer gap-2 p-2'>
              <div className="flex size-6 items-center justify-center rounded-sm border">
                <UserIcon className='size-4 shrink-0' />
              </div>
              <span>Manage Account</span>
            </DropdownMenuItem>
          </Link>
          {isAdmin(userStore?.role) && (
            <Link href='/admin'>
              <DropdownMenuItem className='cursor-pointer gap-2 p-2'>
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <ShieldIcon className='size-4 shrink-0' />
                </div>
                <span>Admin Dashboard</span>
              </DropdownMenuItem>
            </Link>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <SignOutButton>
          <DropdownMenuItem
            variant="destructive"
            className='cursor-pointer gap-2 p-2'
            onClick={() => trackEvent({ name: "sign_out" })}
          >
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
  )
}
