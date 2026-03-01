"use client";

import { GoogleOneTap } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function GoogleOneTapClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <GoogleOneTap />;
}
