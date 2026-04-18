import { getTranslations } from "next-intl/server";

import { getMenuItems, type MenuItem } from "@/shared/ui/layouts/sidebar/menu-items";
import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ws/ui/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@ws/ui/lib/utils";

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const menuItems = await getMenuItems();
  const settingsMenuItems =
    menuItems.find((item) => item.id === "settings")?.subItems ?? [];

  return (
    <AppLayout
      label={t("indexPage.label")}
      description={t("indexPage.description")}
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsMenuItems.map((item: MenuItem) => {
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
