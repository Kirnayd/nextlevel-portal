import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { PwaShell } from "@/shared/components/pwa/pwa-shell";
import { ThemeProvider } from "@/shared/components/theme-provider";
import {
  PWA_ICON_PATHS,
  PWA_THEME_COLOR_DARK,
  PWA_THEME_COLOR_LIGHT,
} from "@/shared/lib/pwa-theme";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nextlevel",
    template: "%s | Nextlevel",
  },
  description: "Корпоративний портал Nextlevel",
  applicationName: "Nextlevel",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nextlevel",
    statusBarStyle: "default",
  },
  icons: {
    apple: PWA_ICON_PATHS.appleTouchIcon,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: PWA_THEME_COLOR_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: PWA_THEME_COLOR_DARK },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <PwaShell />
        </ThemeProvider>
      </body>
    </html>
  );
}
