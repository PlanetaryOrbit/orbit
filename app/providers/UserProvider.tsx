/**
 * Orbit Frontend v2
 *
 * UserProvider is a React context provider that holds the authenticated user's information. This is only used by client components.
 *
 * Server components should use the `getMe` API to retrieve the user's information.
 *
 * @module components/providers/UserProvider
 * @since 3.0.0
 * @author BuddyWinte
 */

"use client";

import {
  createContext,
  useContext,
  ReactNode,
} from "react";

export type OrbitUser = {
  id: string;
  username: string;

  roblox: {
    id: number;
    username: string;
    displayName: string;
    hasVerifiedBadge: boolean;
    isBanned: boolean;
    avatarUrl: string | null;
    syncedAt: string;
  } | null;

  createdAt: string;
  updatedAt: string;
};

type UserContextValue = {
  user: OrbitUser | null;
};

const UserContext = createContext<UserContextValue>({
  user: null,
});

export function UserProvider({
  user,
  children,
}: {
  user: OrbitUser | null;
  children: ReactNode;
}) {
  return (
    <UserContext.Provider
      value={{
        user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
