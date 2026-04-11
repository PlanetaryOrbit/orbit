import React, { FC, ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { workspacestate } from "@/state";
import { useRecoilState } from "recoil";

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onClick?: () => void;
  classoverride?: string;
  loading?: boolean | false;
  workspace?: boolean | false;
  compact?: boolean | false;
  disabled?: boolean | false;
  type?: "button" | "submit" | "reset";
};

const Button: FC<Props> = ({
  children,
  onPress,
  onClick,
  loading,
  classoverride,
  workspace,
  compact,
  disabled,
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onPress || onClick}
      disabled={disabled}
      className={twMerge(
        compact ? "py-2 px-4" : "py-3 px-5",
        "transition rounded-lg text-sm text-white focus-visible:outline-none",
        workspace
          ? "bg-primary hover:bg-primary/80 focus-visible:bg-primary/80 disabled:bg-primary/50 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white dark:disabled:bg-zinc-700/50"
          : "bg-orbit hover:bg-orbit/80 focus-visible:bg-orbit/80 disabled:bg-orbit/50 dark:bg-white dark:text-black dark:hover:bg-zinc-300 dark:disabled:bg-white/50",
        classoverride
      )}
    >
      {loading ? (
        <svg
          className="animate-spin mx-auto h-5 w-5 text-white dark:text-black"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;