"use client";

import { Button } from "@ws/ui/components/ui/button";
import { ChevronLeft } from "@ws/ui/internal-lib/icons";
import { cn } from "@ws/ui/lib/utils";
import { useRouter } from "@/i18n/navigation";
import type { MenuItemId } from "@/shared/ui/layouts/sidebar/menu-items";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { ShaderCard } from "@ws/ui/components/mew-ui/shader/shader-card";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@ws/ui/components/ui/card";

interface AppLayoutProps {
  label?: string;
  description?: string;
  sidebarItem?: MenuItemId;
  children: React.ReactNode;
  render?: React.ReactNode;
  backButton?: boolean;
  className?: string;
}

export function AppLayout({
  children,
  label,
  description,
  sidebarItem,
  render,
  backButton = false,
  className = "",
}: AppLayoutProps) {
  const router = useRouter();
  const t = useTranslations();

  const { resolvedLabel, resolvedDescription } = useMemo(() => {
    if (sidebarItem) {
      const tr = t as (key: string) => string;
      return {
        resolvedLabel: tr(`sidebar.items.${sidebarItem}.label`),
        resolvedDescription: tr(`sidebar.items.${sidebarItem}.description`),
      };
    }
    return { resolvedLabel: label, resolvedDescription: description };
  }, [sidebarItem, label, description, t]);

  return (
    <div className={cn("container mx-auto h-full w-full p-4", className)}>
      <ShaderCard>
        <CardHeader>
          {backButton ? (
            <Button variant="ghost" size="icon" className="mb-2 -ml-2" onClick={() => router.back()} aria-label={t("notFoundPage.goBack")}>
              <ChevronLeft />
            </Button>
          ) : null}
          {resolvedLabel ? <CardTitle className="text-xl">{resolvedLabel}</CardTitle> : null}
          {resolvedDescription ? <CardDescription>{resolvedDescription}</CardDescription> : null}
        </CardHeader>
        <CardContent className="px-4">
          {children}
        </CardContent>
      </ShaderCard>
      {render}
    </div>
  );
}
