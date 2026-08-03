"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

interface Props {
  darkBackground?: string | null;
  lightBackground?: string | null;
}

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function AuthBackground({
  darkBackground,
  lightBackground,
}: Props) {
  const mounted = useMounted();
  const { resolvedTheme } = useTheme();

  if (!mounted) {
    return null;
  }

  const background =
    resolvedTheme === "light"
      ? (lightBackground ?? darkBackground)
      : (darkBackground ?? lightBackground);

  if (!background) {
    return (
      <div
        className="
          absolute inset-0
          bg-linear-to-b
          from-ctp-base/40
          via-ctp-base/80
          to-ctp-base
        "
      />
    );
  }

  return (
    <Image
      src={background}
      alt=""
      fill
      priority
      className="pointer-events-none object-cover"
    />
  );
}
