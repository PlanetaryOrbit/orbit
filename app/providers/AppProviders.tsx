"use client";

import { ThemeProvider } from "next-themes";
import { UserProvider } from "./UserProvider";

export default function AppProviders({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) {
  return (
    <ThemeProvider
      storageKey="orbit-theme"
      defaultTheme="dark"
      enableColorScheme
      attribute="class"
      disableTransitionOnChange
    >
      <UserProvider user={user}>
        {children}
      </UserProvider>
    </ThemeProvider>
  );
}
