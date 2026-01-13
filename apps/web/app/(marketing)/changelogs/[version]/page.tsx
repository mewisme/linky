import { LegalLayout } from "@/components/layouts/legal-layout";
import { MarkdownContent } from "@/components/render/markdown-content";

export default async function ChangelogPage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  return (
    <LegalLayout title={`Changelog - ${version}`} description={`View the changelog for version ${version}.`} lastUpdated="January 2026">
      <MarkdownContent content={
        `# Changelog - ${version}\n\n## Version ${version}\n\n- Added changelog page\n- Added markdown content component\n- Added markdown content component`
      } />
    </LegalLayout>
  )
}