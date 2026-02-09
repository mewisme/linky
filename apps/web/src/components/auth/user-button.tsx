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
import { LogOutIcon, ShieldIcon, UserIcon } from "lucide-react";

import { Kbd } from "@ws/ui/components/ui/kbd";
import { SignOutButton } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserContext } from "@/components/providers/user/user-provider";
import { useUserStore } from "@/stores/user-store";

export function UserButton() {
  const router = useRouter();

  const { user, auth: { signOut } } = useUserContext();
  const { user: userStore } = useUserStore();

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
  )
}