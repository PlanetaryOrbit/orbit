"use client";

import ThemeProvider from "./ThemeProvider";
import { UserProvider } from "./UserProvider";

export default function AppProviders({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) {
  return (
    <ThemeProvider>
      <UserProvider user={user}>
        {children}
      </UserProvider>
    </ThemeProvider>
  );
}
