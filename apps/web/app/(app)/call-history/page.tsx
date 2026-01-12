"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getCallHistory, formatDuration, type CallHistoryRecord } from "@/lib/api/call-history";

import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { Button } from "@repo/ui/components/ui/button";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@repo/ui/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";

import {
  IconRefresh,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconDotsVertical,
  IconPhoneCall,
  IconHistory,
  IconCircleX,
  IconInfoCircle
} from "@tabler/icons-react";
import { CountryFlag } from "@/components/common/country-flag";


export default function CallHistoryPage() {
  const { getToken } = useAuth();
  const [callHistory, setCallHistory] = useState<CallHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCallHistory = async () => {
    try {
      setRefreshing(true);
      const token = await getToken({ template: 'custom', skipCache: true });
      const data = await getCallHistory(token, { limit: 100 });
      setCallHistory(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load call history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchCallHistory(); }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <IconHistory className="h-7 w-7 text-primary" stroke={2} />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Recent Calls</h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage and review your video call activities.
          </p>
        </div>
        <Button
          onClick={fetchCallHistory}
          disabled={refreshing}
          variant="outline"
          className="w-full sm:w-auto shadow-sm"
        >
          <IconRefresh className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Sync History
        </Button>
      </div>

      {error ? (
        <ErrorDisplay error={error} onRetry={fetchCallHistory} />
      ) : callHistory.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Desktop View: Table */}
          <div className="hidden md:block border rounded-lg bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[300px]">User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {callHistory.map((call) => (
                  <TableRow key={call.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={call.other_user?.avatar_url || ""} />
                          <AvatarFallback>{call.other_user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium">{call.other_user?.name}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <CountryFlag countryCode={call.other_user?.country || ""} /> {call.other_user?.country}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1 font-normal">
                        {call.is_caller ? (
                          <IconPhoneOutgoing className="h-3 w-3 text-blue-500" stroke={2.5} />
                        ) : (
                          <IconPhoneIncoming className="h-3 w-3 text-emerald-500" stroke={2.5} />
                        )}
                        {call.is_caller ? "Outgoing" : "Incoming"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {formatDuration(call.duration_seconds || 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(call.started_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                          <IconPhoneCall className="h-4 w-4" />
                        </Button>
                        <CallActionsMenu />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View: List of Cards */}
          <div className="md:hidden space-y-3">
            {callHistory.map((call) => (
              <Card key={call.id} className="overflow-hidden border-l-4 border-l-primary/40">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={call.other_user?.avatar_url || ""} />
                        <AvatarFallback>{call.other_user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-sm leading-tight">{call.other_user?.name}</h3>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          {call.is_caller ? <IconPhoneOutgoing size={12} /> : <IconPhoneIncoming size={12} />}
                          <span>{call.is_caller ? "Outgoing" : "Incoming"}</span>
                          <span>•</span>
                          <span>{formatDuration(call.duration_seconds || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <CallActionsMenu />
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
                    <span>{new Date(call.started_at).toLocaleDateString()}</span>
                    <span>{new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CallActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <IconDotsVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem className="gap-2">
          <IconPhoneCall size={16} /> Call back
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-destructive">
          <IconCircleX size={16} /> Delete record
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LoadingState() {
  return (
    <div className="container mx-auto py-8 px-4 space-y-4">
      <Skeleton className="h-10 w-64 mb-4" />
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
      <IconInfoCircle className="h-12 w-12 text-muted-foreground/50 mb-4" stroke={1.5} />
      <h2 className="text-xl font-semibold">No calls recorded</h2>
      <p className="text-muted-foreground mt-1">Your video call history is currently empty.</p>
    </div>
  );
}

function ErrorDisplay({ error, onRetry }: { error: string, onRetry: () => void }) {
  return (
    <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/20 text-center">
      <p className="text-destructive font-medium mb-4">{error}</p>
      <Button onClick={onRetry} variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
        Retry Connection
      </Button>
    </div>
  );
}