"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
        toast.error("Unable to retrieve Clerk token.");
        return;
      }
      setToken(nextToken);
      toast.success("Clerk token retrieved.");
      setIsGetTokenDialogOpen(false);
    } catch {
      toast.error("Unable to retrieve Clerk token.");
    } finally {
      setIsFetchingToken(false);
    }
  };

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      toast.success("Token copied to clipboard.");
    } catch {
      toast.error("Failed to copy token.");
    }
  };

  if (!isHydrated || !isDevelopmentModeEnabled) {
    return null;
  }

  return (
    <AppLayout
      label="Development"
      description="Sandbox for development-only tooling and future experiments"
      className="space-y-5"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconFlask className="size-5" />
            Security-Sensitive Tools
          </CardTitle>
          <CardDescription>
            Run advanced development operations that should stay hidden in normal usage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <IconKey className="size-4" />
                  Clerk Token Access
                </p>
                <p className="text-sm text-muted-foreground">
                  Retrieve your active Clerk token for debugging requests in local tools.
                </p>
              </div>
              <Badge variant="secondary">Restricted</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setIsGetTokenDialogOpen(true)} disabled={isFetchingToken}>
                Get Clerk Token
              </Button>
              <Button variant="outline" onClick={handleCopyToken} disabled={!token}>
                Copy Token
              </Button>
            </div>
            {tokenPreview ? (
              <div className="mt-4 rounded-md border bg-background p-3">
                <p className="text-xs text-muted-foreground">Latest token preview</p>
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
              Security Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Are you sure you want to retrieve your Clerk token?
              </span>
              <span className="block">
                If this token is leaked, others can impersonate your current session and access protected resources.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmGetToken}
              disabled={confirmCountdown > 0 || isFetchingToken}
              className="min-w-40"
            >
              {confirmCountdown > 0 ? (
                <>Activate in {confirmCountdown}s</>
              ) : (
                <>
                  <IconLock className="mr-2 size-4" />
                  I Understand, Do It
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
