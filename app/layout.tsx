import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { ResponsiveShell } from "@/components/layout/ResponsiveShell";
import { Providers } from "@/components/providers";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Conservative Weather — Miami, FL",
  description: "Intelligent forecast prototype (2050 Direction C — Conservative) on live National Weather Service data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set before paint by THEME_BOOT_SCRIPT, so React must accept the DOM value.
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Providers>
          <Suspense>
            <ResponsiveShell>{children}</ResponsiveShell>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
