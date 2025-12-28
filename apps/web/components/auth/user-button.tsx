"use client";

import { Shield } from "lucide-react";
import { UserButton as UserButtonPrimative } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

export function UserButton() {
  const router = useRouter();

  const { user } = useUserStore();

  return (
    <UserButtonPrimative appearance={{
      baseTheme: dark
    }}
      userProfileMode="navigation"
      userProfileUrl="/user-profile"
    >
      <UserButtonPrimative.MenuItems>
        {user?.role === "admin" && (
          <UserButtonPrimative.Action
            label="Admin Dashboard"
            labelIcon={<Shield className="size-4" />}
            onClick={() => router.push("/admin")}
          />
        )}
      </UserButtonPrimative.MenuItems>
    </UserButtonPrimative>
  )
}