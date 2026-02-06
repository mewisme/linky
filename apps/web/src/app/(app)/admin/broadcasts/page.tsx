"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { IconRefresh, IconSend } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

import { AppLayout } from "@/components/layouts/app-layout";
import type { BroadcastHistoryRow } from "@/components/data-table/broadcasts/define-data";
import { BroadcastsDataTable } from "@/components/data-table/broadcasts/data-table";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { toast } from "@repo/ui/components/ui/sonner";
import { useQuery } from "@tanstack/react-query";
import { useSoundWithSettings } from "@/hooks/audio/use-sound-with-settings";
import { useUserContext } from "@/components/providers/user/user-provider";

interface BroadcastsListResponse {
  data: BroadcastHistoryRow[];
  pagination: { limit: number; offset: number; total: number; totalPages: number };
}

export default function AdminBroadcastsPage() {
  const { state } = useUserContext();
  const { play: playSound } = useSoundWithSettings();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const t = await state.getToken();
      setToken(t);
    };
    void run();
  }, [state]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin", "broadcasts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/broadcasts?limit=50&offset=0", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load broadcasts");
      return res.json() as Promise<BroadcastsListResponse>;
    },
    enabled: !!token,
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        toast.error("Message is required");
        return;
      }

      setIsSubmitting(true);
      try {
        const t = await state.getToken({ skipCache: true });
        if (!t) {
          toast.error("Please sign in again");
          return;
        }

        const res = await fetch("/api/admin/broadcasts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${t}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: trimmedMessage,
            title: title.trim() || undefined,
          }),
        });

        const body = await res.json();

        if (!res.ok) {
          toast.error(body.message || "Failed to send broadcast");
          return;
        }

        playSound("success");
        toast.success(body.message ?? `Broadcast sent to ${body.sent} user(s).`);
        setMessage("");
        setTitle("");
        void refetch();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to send broadcast"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [message, title, state, playSound, refetch]
  );

  const history = data?.data ?? [];

  return (
    <AppLayout
      label="Broadcasts"
      description="Send an announcement to all users (in-app and push)"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>New broadcast</CardTitle>
            <CardDescription>
              All active users will receive this as an in-app notification and a
              push notification if they are not online. Only admins can create
              broadcasts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="broadcast-title">Title (optional)</Label>
                <Input
                  id="broadcast-title"
                  placeholder="e.g. Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="broadcast-message">Message *</Label>
                <Textarea
                  id="broadcast-message"
                  placeholder="Write your announcement..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                  className="bg-background resize-y min-h-[120px]"
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    <IconSend className="mr-2 size-4" />
                    Send broadcast
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Broadcast history</CardTitle>
            <CardDescription>
              Recent broadcasts and who created them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BroadcastsDataTable
              initialData={history}
              leftColumnVisibilityContent={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                >
                  <IconRefresh
                    className={`size-4 ${isFetching ? "animate-spin" : ""}`}
                  />
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
