'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ws/ui/components/ui/card";
import { FileText, Save, Settings2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@ws/ui/components/ui/form"
import { HookFormZodPrimitive, ReactHookFormPrimitive, ZodPrimitive } from "@ws/ui/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ws/ui/components/ui/tabs";
import { getUploadUrl, uploadToS3 } from "@/lib/api/s3";
import { useEffect, useState } from "react";

import type { AdminAPI } from "@/types/admin.types";
import type { ApiError } from "@/types/api.types";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { DatePicker } from "@/components/common/date-picker";
import { Editor } from "@/components/editor/editor";
import { Input } from "@ws/ui/components/ui/input";
import { Switch } from "@ws/ui/components/ui/switch";
import { toast } from "@ws/ui/components/ui/sonner";
import { useRouter } from "next/navigation";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import { useUserContext } from "@/components/providers/user/user-provider";

const { z } = ZodPrimitive;
const { zodResolver } = HookFormZodPrimitive;
const { useForm } = ReactHookFormPrimitive;

const formSchema = z.object({
  version: z.string().min(1, "Version is required"),
  title: z.string().min(1, "Title is required"),
  release_date: z.string().min(1, "Release date is required"),
  is_published: z.boolean().optional(),
  order: z.number().optional().nullable(),
});

export default function CreateChangelogPage() {
  const { state } = useUserContext();
  const { play: playSound } = useSoundWithSettings();
  const router = useRouter();
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const form = useForm<ZodPrimitive.z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      version: "",
      title: "",
      release_date: new Date().toISOString(),
      is_published: false,
      order: null,
    },
  });

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken();
      setToken(token);
    };
    fetchToken();
  }, [state]);

  const onSubmit = async (data: ZodPrimitive.z.infer<typeof formSchema>) => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    if (!markdownContent.trim()) {
      toast.error("Please add changelog content");
      return;
    }

    setIsSubmitting(true);
    try {
      const s3Key = `changelogs/${data.version}.md`;
      const { url } = await getUploadUrl({ key: s3Key, expires: 300 }, token);
      const markdownBlob = new Blob([markdownContent], { type: "text/markdown" });
      await uploadToS3(url, markdownBlob);

      const response = await fetch("/api/admin/changelogs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          s3_key: s3Key,
          is_published: data.is_published ?? false,
        }),
      });

      const result = await response.json() as AdminAPI.Changelogs.Create.Response | ApiError;
      if (!response.ok) throw new Error((result as ApiError).message || "Failed");

      playSound('success');
      toast.success("Changelog created successfully!");
      router.push("/admin/changelogs");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout label="New Release" description="Draft your next product update" backButton={true}>
      <div className="flex flex-col space-y-6">

        <Tabs defaultValue="changelog" className="w-full">
          <div className="flex flex-row justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="changelog" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Content
              </TabsTrigger>
              <TabsTrigger value="metadata" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Metadata
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/admin/changelogs")} size="sm">
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting || !token}
                size="sm"
              >
                {isSubmitting ? "Saving..." : (
                  <><Save className="mr-2 h-4 w-4" /> Create Release</>
                )}
              </Button>
            </div>
          </div>

          <TabsContent value="changelog" className="mt-0 border-none p-0 outline-none">
            <Card className="shadow-sm border-muted">
              <CardHeader className="pb-3">
                <CardTitle>Release Notes</CardTitle>
                <CardDescription>
                  Supports Github-flavored Markdown. Use headings and lists for better readability.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border bg-muted/20">
                  <Editor
                    className="min-h-[500px]"
                    value={markdownContent}
                    onChange={setMarkdownContent}
                    editable={true}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metadata" className="mt-0 border-none p-0 outline-none">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>General Information</CardTitle>
                <CardDescription>Configure how this update appears in the feed.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="version"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Version *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. v1.2.0" className="bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Release Title *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="The 'Big Bang' Update" className="bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="release_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="mb-2 font-semibold">Publish Date *</FormLabel>
                            <DatePicker
                              onChange={(date) => field.onChange(date?.toISOString())}
                              value={field.value ? new Date(field.value) : new Date()}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                      <FormField
                        control={form.control}
                        name="is_published"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 bg-muted/30">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">Public Access</FormLabel>
                              <FormDescription>
                                Visible to all users immediately after creation.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="order"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Display Priority (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                                placeholder="Default is by date"
                                className="bg-background"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}