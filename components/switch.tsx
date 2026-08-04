import { FC, KeyboardEvent } from "react";
import clsx from "clsx";

type Props = {
  onChange?: () => void;
  label: string;
  classoverride?: string;
  disabled?: boolean;
  checked?: boolean;
  id?: string;
};

const SwitchComponent: FC<Props> = ({
  disabled = false,
  onChange,
  label,
  checked = false,
  classoverride,
  id,
}) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange?.();
    }
  };

  return (
    <div className={clsx("flex items-center gap-2", classoverride)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={onChange}
        onKeyDown={handleKeyDown}
        className={clsx(
          "group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-200",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900",

          disabled
            ? [
                "cursor-not-allowed",
                "bg-zinc-200 dark:bg-zinc-800",
                "opacity-60",
              ]
            : [
                "cursor-pointer",
                checked
                  ? "bg-primary"
                  : "bg-zinc-300 dark:bg-zinc-700",
                "hover:brightness-95 dark:hover:brightness-110",
              ],
        )}
      >
        <span
          className={clsx(
            "pointer-events-none block h-5 w-5 rounded-full shadow-sm transition-all duration-200",
            checked
              ? "translate-x-5"
              : "translate-x-0.5",
            disabled
              ? "bg-zinc-400 dark:bg-zinc-600"
              : "bg-white",
          )}
        />
      </button>

      {label && (
        <label
          htmlFor={id}
          className={clsx(
            "text-sm select-none",
            disabled
              ? "cursor-not-allowed text-zinc-400 dark:text-zinc-500"
              : "cursor-pointer text-zinc-700 dark:text-zinc-200",
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default SwitchComponent;
