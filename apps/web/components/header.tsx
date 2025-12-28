"use client";

import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import type { ConnectionStatus } from "@/hooks/use-video-chat";
import Link from "next/link";
import { SparklesIcon } from "@repo/ui/components/ui/sparkles";
import { Spinner } from "@repo/ui/components/ui/spinner";
import { UserButton } from "./auth/user-button";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface HeaderProps {
  connectionStatus?: ConnectionStatus;
}

export function Header({ connectionStatus }: HeaderProps) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  const getStatusBadgeVariant = () => {
    if (!connectionStatus) return "outline";
    switch (connectionStatus) {
      case "connected":
        return "default";
      case "connecting":
        return "secondary";
      case "searching":
        return "secondary";
      case "peer-disconnected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusText = () => {
    if (!connectionStatus) return "";
    switch (connectionStatus) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "searching":
        return "Searching...";
      case "peer-disconnected":
        return "Peer Disconnected";
      default:
        return "Idle";
    }
  };

  if (!isLoaded) {
    return (
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-6 text-primary" />
            <span className="text-xl font-semibold">Linky</span>
          </div>
          <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container relative flex h-12 items-center justify-between px-4 mx-auto">
        {/* Left: Logo + App Name */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80 "
        >
          <SparklesIcon className="size-6 text-primary" />
          <span className="text-xl font-semibold">Linky</span>
        </Link>

        {/* Middle: Connection Status (centered, only when authorized and on chat page) */}
        {isSignedIn && connectionStatus && (
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            <Badge
              variant={getStatusBadgeVariant()}
              className="flex items-center gap-2 text-sm"
            >
              {(connectionStatus === "searching" || connectionStatus === "connecting") && (
                <Spinner className="size-3" />
              )}
              {getStatusText()}
            </Badge>
          </div>
        )}

        {/* Right: Auth Actions */}
        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <Button
              onClick={() => router.push("/sign-in")}
              variant="default"
              size="sm"
            >
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

