import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./styles/styles.css";
import { getSettings } from "@/lib/instance";
import AppProviders from "./providers/AppProviders";
import { getMe } from "@/lib/me";

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
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
