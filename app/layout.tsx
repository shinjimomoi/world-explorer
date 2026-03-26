import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { NavbarProvider } from "./context/navbar";
import Navbar from "./components/Navbar";
import SyncUser from "./components/SyncUser";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  maximumScale: 1,
  userScalable: false,
};

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://world-explorer.vercel.app";

export const metadata: Metadata = {
  title: "World Explorer - Capital City Quiz",
  description:
    "Test your world geography knowledge! Guess the location of capital cities on an interactive map. How many can you find?",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "World Explorer - Capital City Quiz",
    description:
      "Test your world geography knowledge! Guess the location of capital cities on an interactive map. How many can you find?",
    url: siteUrl,
    siteName: "World Explorer",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "World Explorer - Capital City Quiz",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "World Explorer - Capital City Quiz",
    description:
      "Test your world geography knowledge! Guess the location of capital cities on an interactive map. How many can you find?",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-dvh overflow-hidden flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <ClerkProvider>
          <SyncUser />
          <NavbarProvider>
            <Navbar />
            <main className="flex flex-col flex-1 min-h-0 overflow-hidden">{children}</main>
          </NavbarProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
