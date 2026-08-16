import type { Metadata, Viewport } from "next";
import { Geist, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { HeaderNav } from "@/components/HeaderNav";
import { VinylIcon } from "@/components/icons";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Slightly mechanical headline face — reads closer to sleeve typography than Geist does.
const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ArtiTrack",
  description: "Track the artists you follow, their releases, and what you've heard.",
  // Lets iOS open it full-screen from the home screen.
  appleWebApp: { capable: true, title: "ArtiTrack", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#09090f",
  // The app is dark-only, so tell the browser before any CSS loads.
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-5 py-3.5 2xl:max-w-7xl">
            <Link href="/" className="group flex items-center gap-2.5">
              <span className="rounded-full bg-gradient-to-br from-accent to-accent-2 p-[1.5px]">
                <span className="flex size-7 items-center justify-center rounded-full bg-bg">
                  <VinylIcon className="size-5 text-white/85 transition-transform duration-500 group-hover:rotate-180" />
                </span>
              </span>
              <span className="text-[0.95rem] font-semibold tracking-tight">
                Arti<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-2">Track</span>
              </span>
            </Link>

            {/* Its own place in the header rather than a section of the home
                page: the check-out list isn't part of the library. */}
            <HeaderNav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-12 pt-8 2xl:max-w-7xl">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl px-5 pb-10 2xl:max-w-7xl">
          <a
            href="/api/export"
            download
            className="text-xs text-faint transition-colors hover:text-muted"
          >
            Download my data
          </a>
        </footer>
      </body>
    </html>
  );
}
