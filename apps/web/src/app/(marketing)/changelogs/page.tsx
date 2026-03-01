"use client";

import * as Sentry from "@sentry/nextjs";

import { Card, CardContent, CardHeader, CardTitle } from "@ws/ui/components/ui/card";
import { LucideChevronRight, LucideInfo, LucideLoader2 } from "@ws/ui/internal-lib/icons";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@ws/ui/components/ui/badge";
import { Button } from "@ws/ui/components/ui/button";
import { LegalLayout } from "@/shared/ui/layouts/legal-layout";
import Link from "next/link";
import { MarkdownContent } from "@/shared/ui/render/markdown-content";
import type { ResourcesAPI } from "@/shared/types/resources.types";
import { Separator } from "@ws/ui/components/ui/separator";
import { Skeleton } from "@ws/ui/components/ui/skeleton";
import { apiUrl } from "@/lib/http/api-url";
import { fetchData } from "@/lib/http/client-api";
import { useInfiniteQuery } from "@ws/ui/internal-lib/react-query";

const LIMIT = 10;

export default function ChangelogsPage() {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [markdownPreviews, setMarkdownPreviews] = useState<Record<string, string>>({});
  const [fetchingPreviews, setFetchingPreviews] = useState<Set<string>>(new Set());

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["changelogs", "public"],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: pageParam.toString(),
        order_by: 'created_at'
      });
      return fetchData<ResourcesAPI.Changelogs.Get.Response>(
        apiUrl.resources.changelogs(params)
      );
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.reduce((sum, page) => sum + page.data.length, 0);
      const total = lastPage.pagination.total;
      return totalLoaded < total ? totalLoaded : undefined;
    },
    initialPageParam: 0,
  });

  useEffect(() => {
    if (!data) return;
    const fetchPreviews = async () => {
      const previews: Record<string, string> = {};
      for (const page of data.pages) {
        for (const changelog of page.data) {
          if (markdownPreviews[changelog.id] || fetchingPreviews.has(changelog.id)) continue;

          setFetchingPreviews((prev) => new Set(prev).add(changelog.id));
          try {
            const detail = await fetchData<ResourcesAPI.Changelogs.GetByVersion.Response>(
              apiUrl.resources.changelogByVersion(changelog.version)
            );
            if (detail.download_url) {
              const markdownRes = await fetch(detail.download_url);
              if (markdownRes.ok) {
                const markdown = await markdownRes.text();
                previews[changelog.id] = markdown.substring(0, 260) + (markdown.length > 260 ? "..." : "");
              }
            }
          } catch (e) { Sentry.logger.error("Failed to fetch changelog preview", { error: e }); }
          finally { setFetchingPreviews((prev) => { const n = new Set(prev); n.delete(changelog.id); return n; }); }
        }
      }
      if (Object.keys(previews).length > 0) setMarkdownPreviews((prev) => ({ ...prev, ...previews }));
    };
    fetchPreviews();
  }, [data, markdownPreviews, fetchingPreviews]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allChangelogs = data?.pages.flatMap((page) => page.data)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) ?? [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <LegalLayout title="Changelogs" description="Stay updated with the latest improvements and features." lastUpdated="January 2026">
      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-border before:to-transparent">

        {isLoading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] h-32 rounded-xl" />
          </div>
        ))}

        {allChangelogs.map((changelog) => (
          <div key={changelog.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
            <div className="flex items-center justify-center w-10 h-10 rounded-full border bg-background shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            </div>

            <Card className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] hover:shadow-md transition-all duration-300 border-muted-foreground/20">
              <Link href={`/changelogs/${encodeURIComponent(changelog.version || "")}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-xs">
                          v{changelog.version}
                        </Badge>
                        <time className="text-xs text-muted-foreground font-medium">
                          {formatDate(changelog.release_date)}
                        </time>
                      </div>
                      <CardTitle className="text-lg font-bold leading-tight group-hover:text-primary transition-colors">
                        {changelog.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground line-clamp-3">
                    {markdownPreviews[changelog.id] ? (
                      <div className="prose prose-neutral dark:prose-invert max-w-none prose-sm opacity-90">
                        <MarkdownContent content={markdownPreviews[changelog.id] || ""} />
                      </div>
                    ) : fetchingPreviews.has(changelog.id) ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[80%]" />
                      </div>
                    ) : (
                      "No preview available."
                    )}
                  </div>

                  <Separator className="my-4 opacity-50" />

                  <div className="flex items-center text-xs font-semibold text-primary group-hover:gap-2 transition-all">
                    Read full release notes
                    <LucideChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
        ))}

        <div ref={loadMoreRef} className="flex flex-col items-center justify-center py-10 gap-4">
          {isFetchingNextPage && (
            <Button variant="ghost" disabled className="text-muted-foreground">
              <LucideLoader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading more updates...
            </Button>
          )}

          {!hasNextPage && !isLoading && allChangelogs.length > 0 && (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="p-2 rounded-full bg-muted">
                <LucideInfo className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground italic">
                You&apos;ve reached the beginning of our journey.
              </p>
            </div>
          )}
        </div>
      </div>
    </LegalLayout>
  );
}