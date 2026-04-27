"use client";

import { Button } from "@ws/ui/components/ui/button";
import { ChevronLeft } from "@ws/ui/internal-lib/icons";
import { cn } from "@ws/ui/lib/utils";
import { useRouter } from "@/i18n/navigation";
import type { MenuItemId } from "@/shared/ui/layouts/sidebar/menu-items";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { ShaderCard } from "@ws/ui/components/mew-ui/shader/shader-card";

interface AppLayoutProps {
  label?: string;
  description?: string;
  /** Resolves title and description from `sidebar.items.<id>` in messages. */
  sidebarItem?: MenuItemId;
  children: React.ReactNode;
  backButton?: boolean;
  className?: string;
  shaderCard?: boolean;
}

export function AppLayout({
  children,
  label,
  description,
  sidebarItem,
  backButton = false,
  className = "",
  shaderCard = false,
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
      <div className="flex flex-row items-center gap-1">
        {backButton && (
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex flex-col gap-1">
          {resolvedLabel != null && resolvedLabel !== "" && (
            <h1 className="text-2xl font-medium">{resolvedLabel}</h1>
          )}
          {resolvedDescription != null && resolvedDescription !== "" && (
            <p className="text-sm text-muted-foreground">{resolvedDescription}</p>
          )}
        </div>
      </div>
      <div className="h-full w-full">
        {shaderCard ? (
          <ShaderCard>
            {children}
          </ShaderCard>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
