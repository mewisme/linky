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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@ws/ui/components/animate-ui/components/radix/dropdown-menu";
import { CountryFlag } from "@/shared/ui/common/country-flag";
import { LogOutIcon, ShieldIcon, UserIcon, Sun, Moon } from "@ws/ui/internal-lib/icons";

import { Kbd } from "@ws/ui/components/ui/kbd";
import { Link } from "@/i18n/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { isAdmin } from "@/shared/utils/roles";
import { trackEvent } from "@/lib/telemetry/events/client";
import { useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useUserContext } from "@/providers/user/user-provider";
import { useUserStore } from "@/entities/user/model/user-store";
import { useTheme } from "next-themes"
import { IconDeviceDesktop } from "@tabler/icons-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useLocalePreferenceStore } from "@/shared/model/locale-preference-store";
import type { UiLocale } from "@ws/shared-types";

export function UserButton() {
  const t = useTranslations("sidebarHeader");
  const tCommon = useTranslations("common");
  const { user, auth: { signOut } } = useUserContext();
  const { user: userStore } = useUserStore();
  const locale = useLocale() as UiLocale;
  const router = useRouter();
  const pathname = usePathname();
  const setLocalePreference = useLocalePreferenceStore((s) => s.setLocale);
  const { setTheme } = useTheme();

  const switchLocale = useCallback(
    (next: UiLocale) => {
      if (next === locale) return;
      setLocalePreference(next);
      router.replace(pathname, { locale: next });
    },
    [locale, pathname, router, setLocalePreference],
  );


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
        <DropdownMenuLabel className='text-xs text-muted-foreground'>{t("myAccount")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <Link href='/user/profile'>
            <DropdownMenuItem className='cursor-pointer gap-2 p-2'>
              <div className="flex size-6 items-center justify-center rounded-sm border">
                <UserIcon className='size-4 shrink-0' />
              </div>
              <span>{t("manageAccount")}</span>
            </DropdownMenuItem>
          </Link>
          {isAdmin(userStore?.role) && (
            <Link href='/admin'>
              <DropdownMenuItem className='cursor-pointer gap-2 p-2'>
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <ShieldIcon className='size-4 shrink-0' />
                </div>
                <span>{t("adminDashboard")}</span>
              </DropdownMenuItem>
            </Link>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className='text-xs text-muted-foreground'>{t("preferences")}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className='cursor-pointer gap-2 p-2'>
              <div className="flex size-6 items-center justify-center rounded-sm border">
                <Sun className="size-4 shrink-0 dark:hidden text-muted-foreground" />
                <Moon className="size-4 shrink-0 hidden dark:block text-muted-foreground" />
              </div>
              <span>{t("theme")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => setTheme("light")}>
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Sun className="size-4 shrink-0" />
                </div>
                <span>{t("themeLight")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => setTheme("dark")}>
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Moon className="size-4 shrink-0 " />
                </div>
                <span>{t("themeDark")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem className='cursor-pointer gap-2 p-2' onClick={() => setTheme("system")}>
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <IconDeviceDesktop className="size-4 shrink-0" />
                </div>
                <span>{t("themeSystem")}</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className='cursor-pointer gap-2 p-2'>
              <div className="flex size-6 items-center justify-center rounded-sm border">
                <CountryFlag countryCode={locale === "en" ? "US" : "VN"} />
              </div>
              <span>{t("language")}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                className='cursor-pointer gap-2 p-2'
                onClick={() => switchLocale("en")}
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <CountryFlag countryCode="US" />
                </div>
                <span>{tCommon("english")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className='cursor-pointer gap-2 p-2'
                onClick={() => switchLocale("vi")}
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <CountryFlag countryCode="VN" />
                </div>
                <span>{tCommon("vietnamese")}</span>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
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
            <span className='dark:text-red-400'>{t("logout")}</span>
            <DropdownMenuShortcut>
              <Kbd>⇧⌘Q</Kbd>
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
