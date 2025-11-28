import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { apiConfig } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Swiperflix",
  description: "Gesture-first short video player rebuilt with Next.js",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href={apiConfig.baseUrl} crossOrigin="" />
        <link rel="dns-prefetch" href={apiConfig.baseUrl} />
      </head>
      <body className={`${inter.className} h-full bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
