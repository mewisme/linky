'use client'

import { AppLayout } from "@/components/layouts/app-layout";
import { Label } from "@repo/ui/components/ui/label";

export default function CreateChangelogPage() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted");
  }

  return (
    <AppLayout label="Create Changelog" description="Create a new changelog for the app">
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
            </div>
          </div>
        </div>
      </form>
    </AppLayout>
  )
}