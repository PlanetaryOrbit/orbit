"use client";

import Image from "next/image";

interface Props {
  theme: "dark" | "light";
  darkBackground?: string | null;
  lightBackground?: string | null;
}

export default function AuthBackground({
  theme,
  darkBackground,
  lightBackground,
}: Props) {
  const background =
    theme === "light"
      ? (lightBackground ?? darkBackground)
      : (darkBackground ?? lightBackground);

  if (!background) {
    return (
      <div
        className="absolute inset-0 z-0 bg-linear-to-b from-ctp-base/40 via-ctp-base/80 to-ctp-base"
      />
    );
  }

  return (
    <Image
      src={background}
      alt=""
      fill
      priority
      className="pointer-events-none object-cover z-0"
    />
  );
}
