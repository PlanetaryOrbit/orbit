import clsx from "clsx";
import { Award, Medal, Trophy, type LucideIcon } from "lucide-react";

export type PodiumPlace = 1 | 2 | 3;

const PLACE_CONFIG: Record<
  PodiumPlace,
  {
    background: string;
    shadow: string;
    Icon: LucideIcon;
  }
> = {
  1: {
    background: "bg-amber-500",
    shadow: "shadow-amber-500/35",
    Icon: Trophy,
  },
  2: {
    background: "bg-zinc-400",
    shadow: "shadow-zinc-400/30",
    Icon: Medal,
  },
  3: {
    background: "bg-amber-700",
    shadow: "shadow-amber-700/30",
    Icon: Award,
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: "h-5 w-5",
    icon: "h-2.5 w-2.5",
  },
  md: {
    badge: "h-6 w-6 sm:h-7 sm:w-7",
    icon: "h-3 w-3 sm:h-3.5 sm:w-3.5",
  },
  lg: {
    badge: "h-7 w-7 sm:h-8 sm:w-8",
    icon: "h-3.5 w-3.5 sm:h-4 sm:w-4",
  },
} as const;

export function PodiumBadge({
  place,
  size = "md",
  className,
}: {
  place: PodiumPlace;
  size?: keyof typeof SIZE_CONFIG;
  className?: string;
}) {
  const { background, shadow, Icon } = PLACE_CONFIG[place];
  const sizes = SIZE_CONFIG[size];

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-full shadow-md ring-2 ring-white dark:ring-zinc-900",
        sizes.badge,
        background,
        shadow,
        className
      )}
      aria-hidden
    >
      <Icon className={clsx(sizes.icon, "text-white")} strokeWidth={2.5} />
    </div>
  );
}

export function podiumPlaceFromIndex(index: number): PodiumPlace {
  return (index + 1) as PodiumPlace;
}
