import { menuItems, type MenuItem } from "@/components/sidebar/menu-items";
import { AppLayout } from "@/components/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ws/ui/components/ui/card";
import Link from "next/link";
import { cn } from "@ws/ui/lib/utils";

export default function AdminPage() {
  const adminMenuItems = menuItems.find((item) => item.isAdmin)?.subItems ?? [];

  return (
    <AppLayout
      label="Admin Dashboard"
      description="Manage and monitor your application from the admin panel"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminMenuItems.map((item: MenuItem) => {
          const Icon = item.icon;
          return (
            <Link key={item.href || item.label} href={item.href || '#'}>
              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:border-primary/50",
                  "active:scale-[0.98]"
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
                    {item.description || `Manage ${item.label.toLowerCase()}`}
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