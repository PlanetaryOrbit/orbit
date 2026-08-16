import type { InstanceSettings } from "@prisma/client";

export type ClientInstanceSettings = Omit<
  InstanceSettings,
  "id" | "updatedAt" | "createdAt"
> & {
  createdAt: string;
};

export const DEFAULTS: ClientInstanceSettings = {
  name: "Orbit",
  logoUrl: "/favicon.png",
  allowPasswordAuth: true,
  allowRobloxAuth: false,
  enableRegistration: true,
  primaryColor: "#fb019c",
  darkBackground: "/orbitbackground-dark.svg",
  lightBackground: "/orbitbackground-light.svg",
  isSetup: false,
  createdAt: new Date(0).toISOString(),
};
