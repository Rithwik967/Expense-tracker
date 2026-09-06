import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { THEME_BOOTSTRAP_SCRIPT } from "@/components/providers/theme-provider";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: `${APP_NAME} — personal spending tracker`, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  // Amounts and dates are not phone numbers; iOS otherwise linkifies them.
  formatDetection: { telephone: false, date: false, address: false },
  // One person's spending. It has no business in a search index.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom stays available: capping it would fail WCAG 1.4.4.
  maximumScale: 5,
  // Lets the layout paint under the notch, with `pt-safe`/`pb-safe` insetting it.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#121316" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored theme before first paint, so the app never
            flashes light before switching to dark. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
