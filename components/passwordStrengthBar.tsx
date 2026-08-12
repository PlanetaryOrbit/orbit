"use client";

import { calculatePasswordStrength } from "@/utils/passwordStrength";

interface PasswordStrengthBarProps {
  password: string;
}

export default function PasswordStrengthBar({
  password,
}: PasswordStrengthBarProps) {
  const { score, label } = calculatePasswordStrength(password);

  const colors = {
    0: "bg-zinc-700",
    1: "bg-red-500",
    2: "bg-yellow-400",
    3: "bg-lime-400",
    4: "bg-green-500",
  };

  const textColors = {
    0: "text-zinc-500",
    1: "text-red-400",
    2: "text-yellow-400",
    3: "text-lime-400",
    4: "text-green-400",
  };

  return (
    <div className="w-full">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              bar <= score
                ? colors[score]
                : "bg-zinc-800"
            }`}
          />
        ))}
      </div>

      {password && (
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`text-xs font-medium transition-colors duration-300 ${textColors[score]}`}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
}