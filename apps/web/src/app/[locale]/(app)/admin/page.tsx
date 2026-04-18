"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { useMenuItems, type MenuItem } from "@/shared/ui/layouts/sidebar/menu-items";
import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ws/ui/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@ws/ui/lib/utils";
import { useUserStore } from "@/entities/user/model/user-store";
import { isSuperAdmin } from "@/shared/utils/roles";

export default function AdminPage() {
  const t = useTranslations("admin");
  const { user: userStore } = useUserStore();
  const menuItems = useMenuItems();

  const adminMenuItems = useMemo(() => {
    const subItems = menuItems.find((item) => item.id === "adminPanel")?.subItems ?? [];
    return subItems.filter((sub) => {
      if (sub.isSuperAdminOnly && !isSuperAdmin(userStore?.role)) return false;
      return true;
    });
  }, [menuItems, userStore?.role]);

  return (
    <AppLayout
      label={t("hubLabel")}
      description={t("hubDescription")}
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminMenuItems.map((item: MenuItem) => {
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href || "#"}>
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:border-primary/50",
                  "active:scale-[0.98]",
                )}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.label}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppLayout>
  );
}
