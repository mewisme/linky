'use client';

import { ChevronRight } from '@ws/ui/internal-lib/icons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@ws/ui/components/animate-ui/primitives/radix/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar
} from '@ws/ui/components/animate-ui/components/radix/sidebar';
import { useEffect, useMemo } from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { Separator } from '@ws/ui/components/ui/separator';
import { cn } from '@ws/ui/lib/utils';
import { useIsMobile } from '@ws/ui/hooks/use-mobile';
import { useSidebarStore } from '@/shared/model/sidebar-store';
import { useUserStore } from '@/entities/user/model/user-store';
import { useMenuItems, type MenuItem } from './menu-items';
import { isAdmin, isSuperAdmin } from '@/shared/utils/roles';
import { AppSidebarHeader } from './app-sidebar-header';
import { useDevelopmentStore } from '@/shared/model/development-store';

export type { MenuItem };

export function AppSidebar() {
  const { user: userStore } = useUserStore();
  const { variant, collapsible } = useSidebarStore();
  const isDevelopmentModeEnabled = useDevelopmentStore((state) => state.isDevelopmentModeEnabled);
  const menuItems = useMenuItems();
  const pathname = usePathname()
  const { state, setOpenMobile } = useSidebar()
  const isMobile = useIsMobile()
  const isIconRail = state === 'collapsed' && collapsible === 'icon'

  const menuIconFrameClassName = cn(
    'flex aspect-square size-6 shrink-0 grow-0 items-center justify-center rounded-sm border border-sidebar-border',
    isIconRail && 'rounded-md border-2 border-sidebar-border/80',
  )

  const menuIconGlyphClassName = 'size-4 shrink-0 transition-colors duration-300 text-inherit'

  const menuEntryToneClassName =
    'text-muted-foreground data-[active=true]:text-primary'

  const menuButtonIconRailClassName = cn(
    isIconRail &&
      'mx-auto !size-10 !min-h-10 !min-w-10 justify-center !p-2 text-center',
  )

  useEffect(() => {
    useSidebarStore.persist.rehydrate();
    useDevelopmentStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [pathname, isMobile, setOpenMobile]);

  const menuItemsFiltered = useMemo(() => {
    return menuItems
      .filter((item) => {
        if (item.isAdmin && !isAdmin(userStore?.role)) {
          return false;
        }
        return true;
      })
      .map((item) => {
        if (!item.subItems) return item;
        const subItems = item.subItems.filter((sub) => {
          if (sub.isSuperAdminOnly && !isSuperAdmin(userStore?.role)) return false;
          if (sub.requiresDevelopmentMode && !isDevelopmentModeEnabled) return false;
          return true;
        });
        return { ...item, subItems };
      });
  }, [isDevelopmentModeEnabled, menuItems, userStore?.role]);

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <AppSidebarHeader />

      <Separator />

      <SidebarContent className={cn(state === 'expanded' && 'p-2')}>
        <SidebarMenu>
          {menuItemsFiltered.map((item) => {
            const isHrefActive = (href?: string) =>
              Boolean(
                href &&
                  (pathname === href ||
                    pathname.startsWith(`${href}/`)),
              )
            const isSubItemActive = item.subItems?.some((subItem) =>
              isHrefActive(subItem.href),
            )
            return (
              <div key={item.id}>
                {item.subItems ? (
                  <Collapsible defaultOpen={isMobile ? true : item.open ?? false} className="group/collapsible">
                    <SidebarMenuItem className={cn(
                      state === 'collapsed' && 'cursor-pointer transition-colors duration-300',
                    )}>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton className={cn(
                          menuButtonIconRailClassName,
                          isSubItemActive
                            ? 'text-primary'
                            : 'text-muted-foreground',
                          state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300',
                        )} isActive={isSubItemActive}>
                          <div className={menuIconFrameClassName}>
                            <item.icon className={menuIconGlyphClassName} />
                          </div>
                          <span className={cn(
                            'transition-colors duration-300',
                            isIconRail && 'hidden',
                          )}>{item.label}</span>
                          <ChevronRight className={cn(
                            'ml-auto transition-transform duration-300 group-data-[state=open]/collapsible:rotate-90',
                            isIconRail && 'hidden',
                          )} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subItems?.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.id} className={cn(
                              state === 'collapsed' && 'cursor-pointer transition-colors duration-300'
                            )}>
                              <SidebarMenuSubButton className={cn(
                                menuEntryToneClassName,
                                state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300',
                              )}
                                isActive={isHrefActive(subItem.href)}
                                asChild
                              >
                                <Link href={subItem.href || '#'}>
                                  <div className={menuIconFrameClassName}>
                                    <subItem.icon className={menuIconGlyphClassName} />
                                  </div>
                                  <span className={cn('transition-colors duration-300')}>{subItem.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem className={cn(
                    state === 'collapsed' && 'cursor-pointer transition-colors duration-300',
                  )}>
                    <SidebarMenuButton className={cn(
                      menuButtonIconRailClassName,
                      menuEntryToneClassName,
                      state === 'expanded' && 'py-1 [&:hover_*]:text-primary cursor-pointer transition-colors duration-300',
                    )}
                      isActive={isHrefActive(item.href)}
                      asChild
                    >
                      <Link href={item.href || '#'}>
                        <div className={menuIconFrameClassName}>
                          <item.icon className={menuIconGlyphClassName} />
                        </div>
                        <span className={cn('transition-colors duration-300', isIconRail && 'hidden')}>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </div>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail className='h-[98%] my-auto' />
    </Sidebar>
  )
}