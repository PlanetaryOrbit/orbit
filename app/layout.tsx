export const dynamic = "force-dynamic";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./styles/styles.css";
import { getSettings } from "@/lib/instance";
import { getMe } from "@/lib/me";
import Image from "next/image";
import Link from "next/link";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import Button from "@/components/Button";
import ThemeToggle from "@/components/nav/ThemeToggler";
import UserDropdown from "@/components/nav/UserDropdown";
import { cookies } from "next/headers";
import AuthBackground from "@/components/AuthBackground";
import { UserProvider } from "./providers/UserProvider";
import { InstanceProvider } from "./providers/InstanceProvider";
import { serializeSettings } from "@/lib/instance";

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter'
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: '--font-jetbrains',
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
  const user = await getMe();
  const settings = await getSettings();
  const clientSettings = serializeSettings(settings);

  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value ?? "dark";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable} ${theme === "dark" ? "dark" : ""}`}
      style={
        {
          "--instance-primary": settings.primaryColor,
        } as React.CSSProperties
      }
    >
      <body className="bg-ctp-crust text-ctp-text overflow-hidden font-sans">
        <InstanceProvider settings={clientSettings}>
          <UserProvider user={user}>
            <header className="sticky top-0 z-50 border-b border-ctp-surface0 bg-ctp-crust/80 backdrop-blur-xl select-none">
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
                  <ThemeToggle theme={theme as "dark" | "light"} />

                  {user ? (
                    <UserDropdown user={user} />
                  ) : (
                    <>
                      <Button variant="ghost" href="/login">
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
            <main className="relative min-h-screen overflow-hidden bg-ctp-base z-0">
              <AuthBackground
                theme={theme as "dark" | "light"}
                darkBackground={settings.darkBackground}
                lightBackground={settings.lightBackground}
              />
              <div className="relative z-10">{children}</div>
            </main>
          </UserProvider>
        </InstanceProvider>
      </body>
    </html>
  );
}
