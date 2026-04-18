import { TaskResetPassword } from "@clerk/nextjs";
import { getLocale } from "next-intl/server";

import { localePrefixedPath } from "@/i18n/locale-path";

export default async function TaskResetPasswordPage() {
  const locale = await getLocale();
  const redirectUrlComplete = localePrefixedPath(locale, "/user/security");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <TaskResetPassword redirectUrlComplete={redirectUrlComplete} />
    </div>
  );
}