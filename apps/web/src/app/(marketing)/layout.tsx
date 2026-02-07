import type { Metadata } from "next";
import { MarketingProviders } from "./components/marketing-providers";

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const title = "Linky - Random Video Chat with Purpose | Omegle Alternative";
  const description = "Safe, account-based random video chat. Match by interests, add favorites, and earn rewards. Better than Omegle with real profiles, moderation, and progression.";

  return {
    title: {
      default: title,
      template: "%s | Linky",
    },
    description,
    keywords: [
      "random video chat",
      "interest-based video chat",
      "safe video chat",
      "Omegle alternative",
      "Chatroulette alternative",
      "video chat with strangers",
      "account-based chat",
      "moderated video chat",
      "video chat progression",
      "match by interests",
    ],
    metadataBase: new URL(appUrl),
    openGraph: {
      title,
      description,
      url: appUrl,
      siteName: "Linky",
      images: [
        {
          url: `${appUrl}/og`,
          width: 1200,
          height: 630,
          alt: "Linky - Random Video Chat with Purpose",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appUrl}/og`],
    },
    alternates: {
      canonical: appUrl,
    },
  };
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingProviders>
      {children}
    </MarketingProviders>
  )
}