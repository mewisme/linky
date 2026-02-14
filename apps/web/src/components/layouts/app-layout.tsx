"use client";

interface AppLayoutProps {
  label?: string;
  children: React.ReactNode;
  description?: string;
  backButton?: boolean;
  className?: string;
}

import { Button } from "@ws/ui/components/ui/button";
import { ChevronLeft } from "@ws/ui/internal-lib/icons";
import { cn } from "@ws/ui/lib/utils";
import { useRouter } from "next/navigation";

export function AppLayout({ children, label, description, backButton = false, className = "" }: AppLayoutProps) {
  const router = useRouter();
  return (
    <div className={cn('w-full h-full container mx-auto p-4', className)}>
      <div className="flex flex-row items-center gap-1">
        {backButton && (
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium">{label}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="w-full h-full">
        {children}
      </div>
    </div>
  )
}