import { LegalLayout } from "@/components/layouts/legal-layout";
import { MarkdownContent } from "@/components/render/markdown-content";
import type { ResourcesAPI } from "@/types/resources.types";
import { Separator } from "@repo/ui/components/ui/separator";
import { Skeleton } from "@repo/ui/components/ui/skeleton";
import { notFound } from "next/navigation";

async function getChangelog(version: string): Promise<ResourcesAPI.Changelogs.GetByVersion.Response | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const res = await fetch(`${apiUrl}/api/v1/changelogs/${encodeURIComponent(version)}`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getMarkdown(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return res.ok ? res.text() : null;
  } catch { return null; }
}

export default async function ChangelogDetailPage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const decodedVersion = decodeURIComponent(version);
  const data = await getChangelog(decodedVersion);
  if (!data) notFound();
  const content = await getMarkdown(data.download_url);
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <LegalLayout
      title={data.title}
      description={`Discover the latest improvements in version ${data.version}`}
      lastUpdated={formatDate(data.release_date)}
    >
      <div className="max-w-4xl mx-auto">
        <Separator className="mb-12 opacity-50" />

        <main className="min-h-[400px]">
          {content ? (
            <div className="prose prose-neutral dark:prose-invert max-w-none 
              prose-headings:font-bold prose-headings:tracking-tight
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-pre:bg-muted prose-pre:border prose-pre:rounded-xl
              prose-img:rounded-2xl prose-img:shadow-lg prose-img:border">
              <MarkdownContent content={content} />
            </div>
          ) : (
            <div className="space-y-6">
              <Skeleton className="h-8 w-[60%]" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
              </div>
              <Skeleton className="h-[300px] w-full rounded-2xl" />
            </div>
          )}
        </main>
      </div>
    </LegalLayout>
  );
}