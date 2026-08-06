import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type {
  ButtonHTMLAttributes,
  ComponentType,
  SVGProps,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { Transition } from "@headlessui/react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

type ButtonSize =
  | "sm"
  | "md"
  | "lg";

type IconComponent = ComponentType<
  SVGProps<SVGSVGElement>
>;

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconComponent;
  iconSrc?: string;
  href?: string;
  iconOnly?: boolean;
  "aria-label"?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary: [
    "border border-ctp-instance",
    "bg-ctp-instance",
    "text-ctp-base",
    "shadow-sm",
    "hover:border-ctp-instance-secondary",
    "hover:bg-ctp-instance-secondary",
    "hover:shadow-lg",
  ].join(" "),

  secondary: [
    "border border-ctp-surface1",
    "bg-ctp-surface0/70",
    "backdrop-blur-sm",
    "text-ctp-text",
    "shadow-sm",
    "hover:border-ctp-surface2",
    "hover:bg-ctp-surface1",
    "hover:shadow-lg",
  ].join(" "),

  ghost: [
    "border border-transparent",
    "bg-transparent",
    "text-ctp-subtext1",
    "hover:bg-ctp-surface0",
    "hover:text-ctp-text",
  ].join(" "),

  danger: [
    "border border-ctp-red",
    "bg-ctp-red",
    "text-ctp-base",
    "shadow-sm",
    "hover:bg-ctp-maroon",
    "hover:border-ctp-maroon",
    "hover:shadow-lg",
  ].join(" "),
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

const iconSizes: Record<ButtonSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export default function Button({
  variant = "ghost",
  size = "md",
  loading = false,
  icon: Icon,
  iconSrc,
  iconOnly = false,
  children,
  disabled,
  href,
  className = "",
  type = "button",
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonClass = [
    "group",
    "inline-flex",
    "items-center",
    "justify-center",
    iconOnly ? "aspect-square p-0" : size === "lg" ? "gap-2" : "gap-1.5",
    "rounded-xl",
    "font-medium",
    "leading-none",
    "select-none",
    "whitespace-nowrap",
    "cursor-pointer",
    "touch-manipulation",
    "transition-all",
    "duration-150",
    "ease-out",
    "motion-safe:hover:-translate-y-0.5",
    "motion-safe:active:translate-y-0",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-ctp-instance/70",
    "focus-visible:ring-offset-2",
    "focus-visible:ring-offset-ctp-crust",
    "disabled:pointer-events-none",
    "disabled:cursor-not-allowed",
    "disabled:opacity-50",
    "disabled:saturate-50",
    "disabled:shadow-none",
    "disabled:translate-y-0",
    iconOnly
      ? sizes[size]
          .split(" ")
          .filter((x) => x.startsWith("min-h"))
          .join(" ")
      : sizes[size],
    variants[variant],
    className,
  ].join(" ");

  const iconClass = iconSizes[size];

  const content = (
    <>
      {(loading || Icon || iconSrc) && (
        <span className="inline-flex shrink-0 items-center justify-center leading-none">
          <Transition
            show={!loading}
            enter="transition duration-150"
            enterFrom="opacity-0 scale-90"
            enterTo="opacity-100 scale-100"
            leave="transition duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-90"
          >
            {loading ? (
              <ArrowPathIcon
                className={`${iconClass} animate-spin`}
                aria-hidden="true"
              />
            ) : iconSrc ? (
              <Image
                src={iconSrc}
                alt=""
                width={20}
                height={20}
                className={iconClass}
              />
            ) : (
              Icon && (
                <Icon
                  className={iconClass}
                  aria-hidden="true"
                />
              )
            )}
          </Transition>
        </span>
      )}

      {!iconOnly && children && (
        <span className="inline-flex items-center leading-none">
          {children}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={buttonClass}
        aria-label={iconOnly ? ariaLabel : undefined}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      className={buttonClass}
      aria-label={iconOnly ? ariaLabel : undefined}
      aria-busy={loading}
    >
      {content}
    </button>
  );
}
