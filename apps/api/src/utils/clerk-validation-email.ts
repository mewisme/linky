import { getAdminConfigByKey } from "@/infra/supabase/repositories/admin-config.js";

type ContentPosition = "prefix" | "suffix" | "include" | null;

export async function canAutoRemoveUserEmail(email?: string) {
  if (!email) return false;

  const [includeContent, contentPosition] = await Promise.all([
    getAdminConfigByKey("clerk_auto_remove_user_email_content"),
    getAdminConfigByKey<ContentPosition>("clerk_auto_remove_user_email_content_position"),
  ]);

  const normalizedEmail = email.toLowerCase();
  const localPart = normalizedEmail.split("@")[0];

  if (!localPart?.includes("+clerk_test")) return false;

  const autoRemoveContent =
    typeof includeContent?.value === "string"
      ? includeContent.value.trim().toLowerCase()
      : "";

  const position = contentPosition?.value;

  if (!autoRemoveContent || !position) return false;

  const beforeClerkTest = localPart.split("+clerk_test")[0];

  switch (position) {
    case "prefix":
      return beforeClerkTest?.startsWith(autoRemoveContent);

    case "suffix":
      return beforeClerkTest?.endsWith(autoRemoveContent);

    case "include":
      return beforeClerkTest?.includes(autoRemoveContent);

    default:
      return false;
  }
}