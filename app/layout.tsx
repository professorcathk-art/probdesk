import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/footer";
import { LanguageProvider } from "@/components/language-provider";
import { SiteNav } from "@/components/site-nav";
import { getMyProfileAvatar } from "@/actions/profile";
import { getAuthContext } from "@/lib/auth-context";
import { getMetadataBase } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans-body",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Probdesk — Matching built on what you're looking for",
  description:
    "Thoughtful human matching with Smart Matchmaking, Explore, and mutual acceptance before identities unlock.",
  metadataBase: getMetadataBase(),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getAuthContext();
  let avatarUrl: string | null = null;
  if (user) {
    const av = await getMyProfileAvatar();
    avatarUrl = "error" in av ? null : av.avatar_url;
  }

  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <LanguageProvider>
          <SiteNav isAuthenticated={!!user} avatarUrl={avatarUrl} />
          <div className="relative flex-1">{children}</div>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
