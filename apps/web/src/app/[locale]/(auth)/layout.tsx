import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Auth";
  const description = "Connect with your account";
  const images = [`/og/simple?title=${encodeURIComponent(title)}`];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
    },
  }
}

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return children
}