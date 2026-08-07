"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  type ClientInstanceSettings,
} from "@/lib/instance";
import { DEFAULTS } from "@/lib/types";


interface InstanceContextValue {
  settings: ClientInstanceSettings;
  refreshSettings: () => Promise<void>;
}

const InstanceContext = createContext<InstanceContextValue | null>(null);

export function InstanceProvider({
  settings: initialSettings,
  children,
}: {
  settings?: ClientInstanceSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] =
    useState<ClientInstanceSettings>(
      initialSettings ?? DEFAULTS,
    );

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/instance");

      if (!res.ok) {
        toast.error("Failed to refresh instance settings.");
        return;
      }

      const data = await res.json();

      if (data.success) {
        setSettings(data.data);
        toast.success(
          "Instance settings refreshed successfully.",
        );
        return;
      }

      toast.error(
        data.error?.message ??
          "Failed to refresh instance settings.",
      );
    } catch (error) {
      console.error(
        "Failed to refresh instance settings:",
        error,
      );

      toast.error("Unable to connect to the server.");
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
