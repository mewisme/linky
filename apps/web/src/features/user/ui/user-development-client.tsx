"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  IconAlertTriangle,
  IconFlask,
  IconKey,
  IconLock,
} from "@tabler/icons-react";

import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { useDevelopmentStore } from "@/shared/model/development-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ws/ui/components/ui/card";
import { Button } from "@ws/ui/components/ui/button";
import { Badge } from "@ws/ui/components/ui/badge";
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ws/ui/components/animate-ui/components/radix/alert-dialog";

export function UserDevelopmentClient() {
  const t = useTranslations("development");
  const ts = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const { getToken } = useAuth();
  const isDevelopmentModeEnabled = useDevelopmentStore(
    (state) => state.isDevelopmentModeEnabled
  );
  const [isHydrated, setIsHydrated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isGetTokenDialogOpen, setIsGetTokenDialogOpen] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const [isFetchingToken, setIsFetchingToken] = useState(false);

  useEffect(() => {
    void Promise.resolve(useDevelopmentStore.persist.rehydrate()).then(() => {
      setIsHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (isHydrated && !isDevelopmentModeEnabled) {
      router.replace("/user/profile");
    }
  }, [isDevelopmentModeEnabled, isHydrated, router]);

  useEffect(() => {
    if (!isGetTokenDialogOpen) {
      setConfirmCountdown(0);
      return;
    }

    setConfirmCountdown(10);
  }, [isGetTokenDialogOpen]);

  useEffect(() => {
    if (confirmCountdown <= 0) return;
    const timer = setTimeout(() => {
      setConfirmCountdown((previous) => previous - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [confirmCountdown]);

  const tokenPreview = useMemo(() => {
    if (!token) return null;
    if (token.length <= 24) return token;
    return `${token.slice(0, 12)}...${token.slice(-12)}`;
  }, [token]);

  const handleConfirmGetToken = async () => {
    setIsFetchingToken(true);
    try {
      const nextToken = await getToken();
      if (!nextToken) {
        toast.error(t("clerkTokenError"));
        return;
      }
      setToken(nextToken);
      toast.success(t("clerkTokenSuccess"));
      setIsGetTokenDialogOpen(false);
    } catch {
      toast.error(t("clerkTokenError"));
    } finally {
      setIsFetchingToken(false);
    }
  };

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success(t("tokenCopied"));
    } catch {
      toast.error(t("tokenCopyFailed"));
    }
  };

  if (!isHydrated || !isDevelopmentModeEnabled) {
    return null;
  }

  return (
    <AppLayout
      label={ts("development")}
      description={t("pageDescription")}
      className="space-y-5"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconFlask className="size-5" />
            {t("sensitiveToolsTitle")}
          </CardTitle>
          <CardDescription>
            {t("sensitiveToolsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <IconKey className="size-4" />
                  {t("clerkTokenAccess")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("clerkTokenHint")}
                </p>
              </div>
              <Badge variant="secondary">{t("restricted")}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setIsGetTokenDialogOpen(true)} disabled={isFetchingToken}>
                {t("getClerkToken")}
              </Button>
              <Button variant="outline" onClick={handleCopyToken} disabled={!token}>
                {t("copyToken")}
              </Button>
            </div>
            {tokenPreview ? (
              <div className="mt-4 rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">{t("tokenPreviewLabel")}</p>
                <p className="mt-1 break-all font-mono text-xs">{tokenPreview}</p>
              </div>
            ) : null}
          </div>

        </CardContent>
      </Card>

      <AlertDialog open={isGetTokenDialogOpen} onOpenChange={setIsGetTokenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <IconAlertTriangle className="size-4" />
              {t("securityConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t("securityConfirmLine1")}
              </span>
              <span className="block">
                {t("securityConfirmLine2")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmGetToken}
              disabled={confirmCountdown > 0 || isFetchingToken}
              className="min-w-40"
            >
              {confirmCountdown > 0 ? (
                <>{t("activateIn", { seconds: confirmCountdown })}</>
              ) : (
                <>
                  <IconLock className="mr-2 size-4" />
                  {t("understandDoIt")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
