import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "World Explorer",
  description: "Explore the world, one country at a time.",
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border sm:px-6 sm:py-4">
          <a href="/" className="text-lg font-semibold tracking-wide text-foreground hover:text-accent-hover transition-colors">
            World Explorer
          </a>
          <nav className="flex gap-6 text-sm text-foreground-muted">
            <a href="/game" className="hover:text-foreground transition-colors">Play</a>
            <a href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</a>
          </nav>
        </header>
        <main className="flex flex-col flex-1">{children}</main>
      </body>
    </html>
  );
}
