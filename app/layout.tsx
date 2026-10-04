import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/footer";
import { LanguageProvider } from "@/components/language-provider";
import { SiteNav } from "@/components/site-nav";
import { getMyProfileAvatar } from "@/actions/profile";
import { getAuthContext } from "@/lib/auth-context";
import { getMetadataBase, getSiteOrigin } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans-body",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const siteTitle = "Vennode — 尋找對的人，不論是 1 對 1 還是群組活動";
const siteDescription =
  "在 Vennode 發布 1 對 1 或群組活動，用自己的話搜尋合適的人。你先申請，對方同意後才會開啟聯絡。適合找夥伴、教練、活動、合作與認真認識的人。";

export const metadata: Metadata = {
  title: siteTitle,
  description: siteDescription,
  metadataBase: getMetadataBase(),
  keywords: [
    "Vennode",
    "1對1",
    "群組活動",
    "找人",
    "找活動",
    "認識新朋友",
    "香港活動",
    "meetup",
    "find people",
    "group activity",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/vennode-mark.png", type: "image/png" }],
    apple: [{ url: "/vennode-mark.png", type: "image/png" }],
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    locale: "zh_HK",
    type: "website",
    images: [{ url: "/vennode-mark.png", alt: "Vennode" }],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/vennode-mark.png"],
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
  if (user) {
    const av = await getMyProfileAvatar();
    avatarUrl = "error" in av ? null : av.avatar_url;
  }

  return (
    <html lang="zh-Hant" className={`${inter.variable} ${spaceGrotesk.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Vennode",
              description: siteDescription,
              inLanguage: "zh-Hant",
              potentialAction: {
                "@type": "SearchAction",
                target: `${getSiteOrigin()}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <LanguageProvider>
          <SiteNav
            isAuthenticated={!!user}
            avatarUrl={avatarUrl}
            messengerUnreadInitial={0}
          />
          <div className="relative flex-1">{children}</div>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
