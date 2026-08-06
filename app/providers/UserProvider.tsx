"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

import type { MeUser } from "@/lib/me";

interface UserContext {
  user: MeUser | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContext | null>(null);

export function UserProvider({
  user: initialUser,
  children,
}: {
  user: MeUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<MeUser | null>(initialUser);

  const refreshUser = useCallback(async () => {
    const res = await fetch("/api/users/me");

    if (!res.ok) {
      setUser(null);
      return;
    }

    const data = await res.json();
    setUser(data.user);
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error(
      "useUser must be used inside UserProvider"
    );
  }

  return context;
}
