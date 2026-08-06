"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import Button from "@/components/Button";
import { setThemeAction } from "@/app/actions/theme";

export default function ThemeToggle({
  theme,
}: {
  theme: "dark" | "light";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const isDark = theme === "dark";

  function toggle() {
    startTransition(async () => {
      await setThemeAction(isDark ? "light" : "dark");
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="md"
      onClick={toggle}
      disabled={pending}
      aria-label="Toggle theme"
      iconOnly
      icon={isDark ? SunIcon : MoonIcon}
    />
  );
}
