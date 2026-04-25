'use client';

import {
  IconAlertTriangle,
  IconHome,
  IconRefresh
} from "@tabler/icons-react";

import { Button } from "@ws/ui/components/ui/button";
import { Link } from "@/i18n/navigation";
import { RootNextIntlProvider } from "@/providers/i18n/root-next-intl-provider";
import { beVietnamPro } from "@/shared/fonts/be-vietnam-pro";
import { trackEvent } from "@/lib/telemetry/events/client";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

function RootErrorContent({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorsPage");
  useEffect(() => {
    trackEvent({ name: "error_occurred", properties: { message: error.message, digest: error.digest ?? null } });
  }, [error]);

  return (
    <div className={`relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 ${beVietnamPro.className}`}>
      <div className="absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-destructive/5 blur-[120px]" />
      </div>

      <div className="mx-auto flex max-w-[540px] flex-col items-center text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5">
          <IconAlertTriangle size={40} stroke={1.5} className="text-destructive" />
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>

        <p className="mb-10 text-lg text-muted-foreground">
          {t("description")}
        </p>

        <div className="flex flex-col-reverse gap-3 w-full sm:flex-row sm:justify-center sm:gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => reset()}
            className="group px-8 font-medium border-border hover:bg-secondary"
          >
            <IconRefresh size={18} className="mr-2 transition-transform group-hover:rotate-180 duration-500" />
            {t("tryAgain")}
          </Button>

          <Button
            variant="default"
            size="lg"
            className="px-8 font-medium shadow-lg shadow-primary/20"
            render={
              <Link href="/">
                <IconHome size={18} className="mr-2" />
                {t("goHome")}
              </Link>
            }
          />
        </div>

        <div className="mt-12 w-full rounded-xl border border-border/50 bg-muted/30 p-4 text-left">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            {t("errorReference")}
          </div>
          <code className="block text-sm font-mono text-destructive/80 break-all bg-destructive/5 p-2 rounded">
            {error.digest || "ERR_RUNTIME_EXCEPTION"}
          </code>
        </div>
      </div>

      <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
    </div>
  );
}

export default function RootErrorFallback(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RootNextIntlProvider>
      <RootErrorContent {...props} />
    </RootNextIntlProvider>
  );
}
