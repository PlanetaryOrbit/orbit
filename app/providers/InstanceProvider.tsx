"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

import type { ClientInstanceSettings } from "@/lib/instance";

interface InstanceContextValue {
  settings: ClientInstanceSettings;
  refreshSettings: () => Promise<void>;
}

const InstanceContext = createContext<InstanceContextValue | null>(null);

export function InstanceProvider({
  settings: initialSettings,
  children,
}: {
  settings: ClientInstanceSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(initialSettings);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/instance");

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error("Failed to refresh instance settings:", error);
    }
  }, []);

  return (
    <InstanceContext.Provider
      value={{
        settings,
        refreshSettings,
      }}
    >
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstance() {
  const context = useContext(InstanceContext);

  if (!context) {
    throw new Error(
      "useInstance must be used inside InstanceProvider",
    );
  }

  return context;
}
