import { LegalLayout } from "@/components/layouts/legal-layout";
import { MarkdownContent } from "@/components/render/markdown-content";

export default function ChangelogsPage() {
  return (
    <LegalLayout title="Changelogs" description="View the changelogs for Linky." lastUpdated="January 2026">
      <MarkdownContent content={
        '# Changelogs\n\n## Version 1.0.0\n\n- Added changelog page\n- Added markdown content component\n- Added markdown content component'
      } />
    </LegalLayout>
  )
}