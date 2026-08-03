import { Inter } from "next/font/google";
import "./styles/styles.css";
import { getSettings } from "@/lib/instance";

const inter = Inter({
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();

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
        {children}
      </body>
    </html>
  );
}
