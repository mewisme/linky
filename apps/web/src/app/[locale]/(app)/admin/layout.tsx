"use client";

import { Loading } from "@/shared/ui/common/loading";
import { isAdmin } from "@/shared/utils/roles";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useUserContext } from "@/providers/user/user-provider";
import { useTranslations } from "next-intl";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const { auth: { isSignedIn, isLoaded: clerkLoaded }, store: { user: userStore } } = useUserContext();

  useEffect(() => {
    if (!clerkLoaded) {
      return;
    }

    if (!isSignedIn) {
      router.push("/");
      return;
    }

    if (userStore && !isAdmin(userStore.role)) {
      router.push("/");
      return;
    }
  }, [userStore, isSignedIn, clerkLoaded, router]);

  if (!clerkLoaded || !userStore) {
    return (
      <Loading height={'full'} width={'full'} size="lg" title={t("loadingAdminResources")} />
    );
  }

  if (!isAdmin(userStore.role)) {
    return null;
  }

  return children;
}
