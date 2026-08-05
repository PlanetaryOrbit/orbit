import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./styles/styles.css";
import { getSettings } from "@/lib/instance";
import AppProviders from "./providers/AppProviders";
import { getMe } from "@/lib/me";
import Image from "next/image";
import Link from "next/link";
import {
  UserPlusIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/Button";
import ThemeToggle from "@/components/nav/ThemeToggler";

const inter = Inter({
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();

  return {
    title: settings.name,
    icons: {
      icon: settings.faviconUrl ?? "/favicon.png",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getSettings();

  return {
    themeColor: settings.primaryColor,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();
  const user = await getMe();

  return (
    <html
      lang="en"
      className={inter.className}
      suppressHydrationWarning
      style={
        {
          "--instance-primary": settings.primaryColor,
        } as React.CSSProperties
      }
    >
      <body className="bg-ctp-crust text-ctp-text overflow-hidden">
        <AppProviders user={user}>
          <header className="sticky top-0 z-50 border-b border-ctp-surface0 bg-ctp-crust/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
              <Link href="/">
                <Image
                  src="/planetary.png"
                  alt="Planetary"
                  width={125}
                  height={60}
                  className="h-auto w-auto"
                  priority
                />
              </Link>

              <div className="flex items-center gap-3">
                <ThemeToggle />

                {user ? (
                  <button
                    className="
                      flex
                      cursor-pointer
                      items-center
                      gap-3
                      rounded-xl
                      px-2
                      py-1.5
                      transition
                      hover:bg-ctp-surface0
                    "
                  >
                    <Image
                      src={
                        user.roblox?.avatarUrl ??
                        "/favicon.png"
                      }
                      alt={user.username}
                      width={40}
                      height={40}
                      className="rounded-full border border-ctp-surface1 bg-ctp-surface0"
                    />

                    <span
                      className="hidden text-sm font-medium sm:block"
                    >
                      {user.username}
                    </span>

                    <ChevronDownIcon
                      className="h-4 w-4 text-ctp-subtext0"
                    />
                  </button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      href="/login"
                    >
                      Login
                    </Button>

                    <Button
                      variant="primary"
                      icon={UserPlusIcon}
                      href="/signup"
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>
          </header>
          <main className="relative min-h-screen overflow-hidden bg-ctp-base">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
