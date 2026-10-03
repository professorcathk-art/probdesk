import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/footer";
import { LanguageProvider } from "@/components/language-provider";
import { SiteNav } from "@/components/site-nav";
import { getMessengerUnreadThreadCount } from "@/actions/messenger";
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
  title: "Vennode — 尋找對的人，不論是 1 對 1 還是群組活動",
  description:
    "A light, person-centered place to meet one to one or join a group. You apply, the host decides, and contact unlocks only after approval.",
  metadataBase: getMetadataBase(),
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "any" }],
    apple: [{ url: "/logo.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Vennode — 尋找對的人，不論是 1 對 1 還是群組活動",
    description:
      "A light, person-centered place to meet one to one or join a group. You apply, the host decides, and contact unlocks only after approval.",
    images: [{ url: "/logo.png", alt: "Vennode" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vennode — 尋找對的人，不論是 1 對 1 還是群組活動",
    description:
      "A light, person-centered place to meet one to one or join a group. You apply, the host decides, and contact unlocks only after approval.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getAuthContext();
  let avatarUrl: string | null = null;
  let messengerUnreadInitial = 0;
  if (user) {
    const av = await getMyProfileAvatar();
    avatarUrl = "error" in av ? null : av.avatar_url;
    const unreadRes = await getMessengerUnreadThreadCount();
    messengerUnreadInitial = typeof unreadRes === "number" ? unreadRes : 0;
  }

  return (
    <html lang="zh-Hant" className={`${inter.variable} ${spaceGrotesk.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <LanguageProvider>
          <SiteNav
            isAuthenticated={!!user}
            avatarUrl={avatarUrl}
            messengerUnreadInitial={messengerUnreadInitial}
          />
          <div className="relative flex-1">{children}</div>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
