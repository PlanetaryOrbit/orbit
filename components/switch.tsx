import { FC } from "react";
import clsx from "clsx";

type Props = {
  onChange?: () => void;
  label: string;
  classoverride?: string;
  disabled?: boolean;
  checked?: boolean;
};

const SwitchComponenet: FC<Props> = ({
  disabled,
  onChange,
  label,
  checked,
  classoverride,
}: Props) => {
  return (
    <div className={clsx("flex items-center", classoverride)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
        className={clsx(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          disabled
            ? "cursor-not-allowed bg-zinc-200 dark:bg-zinc-700"
            : "cursor-pointer",
          !disabled && (checked ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700")
        )}
      >
        <span
          className="inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
      {label ? (
        <p className="ml-2 text-sm text-zinc-700 dark:text-white">{label}</p>
      ) : null}
    </div>
  );
};

export default SwitchComponenet;