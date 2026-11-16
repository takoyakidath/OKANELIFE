import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { OfflineBanner } from "@/components/offline-banner";
import { RegisterServiceWorker } from "@/components/register-service-worker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OKANELIFE",
    template: "%s | OKANELIFE",
  },
  description:
    "あなたは、これまでの人生でいくら稼いだ？ 収入を記録し、積み重ね、振り返るお金のライフログ。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OKANELIFE",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#c9713f" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2420" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${notoSansJP.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <OfflineBanner />
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
